import React, { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabaseClient';
import { useParams } from 'react-router-dom';

export default function Consent() {
  const [patientName, setPatientName] = useState('');
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const { id: patientId } = useParams();

  useEffect(() => {
    // Fetch patient name
    supabase
      .from('patients')
      .select('first_name, last_name')
      .eq('id', patientId)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setPatientName(`${data.first_name} ${data.last_name}`);
        }
      });

    // Initialize SignaturePad
    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,1)' });
    sigPadRef.current = signaturePad;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      signaturePad.clear();
    };

    window.addEventListener('resize', resize);
    resize();

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [patientId]);

  const handleClear = () => {
    sigPadRef.current && sigPadRef.current.clear();
  };

  const handleSave = async () => {
    const signaturePad = sigPadRef.current;
    if (!signaturePad || signaturePad.isEmpty()) {
      alert('Por favor firme primero');
      return;
    }

    // Render container to canvas
    const element = document.getElementById('consent-container');
    const rendered = await html2canvas(element, { scale: 2 });
    const imgData = rendered.toDataURL('image/png');

    // Create PDF
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const usableWidth = pageWidth - 2 * margin;
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * usableWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);

    const pageHeight = pdf.internal.pageSize.getHeight();
    if (imgHeight > pageHeight - 2 * margin) {
      pdf.addPage();
      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin - (pageHeight - 2 * margin),
        usableWidth,
        imgHeight
      );
    }

    const pdfBlob = pdf.output('blob');
    const timestamp = Date.now();
    const filePath = `documents/consent-${patientId}-${timestamp}.pdf`;
    const { data: uploadData, error: uploadErr } = await supabase
      .storage
      .from('patient-documents')
      .upload(filePath, pdfBlob, { upsert: true });
    if (uploadErr) {
      console.error(uploadErr);
      alert('No se pudo subir el PDF de consentimiento.');
      return;
    }

    const { error: insertErr } = await supabase
      .from('patient_documents')
      .insert({
        patient_id: patientId,
        template_key: 'consent',
        file_url: uploadData.path,
        file_type: 'pdf'
      });
    if (insertErr) {
      console.error(insertErr);
      alert('No se pudo registrar el documento en la base de datos.');
      return;
    }

    alert('Consentimiento guardado correctamente.');
  };

  return (
    <div id="consent-container" className="container">
      <h2>Consentimiento Informado</h2>
      <p>
        Yo, <strong>{patientName}</strong>, declaro haber sido informada y entender los siguientes puntos respecto a mi estadía en Beauty Recovery Home:
      </p>
      <ul>
        <li>Entiendo que este es un centro de recuperación no médico, donde no se administran medicamentos ni se realizan procedimientos médicos.</li>
        <li>Me comprometo a seguir las indicaciones postoperatorias dadas por mi cirujano y notificarlas al personal de la casa en caso necesario.</li>
        <li>El personal está capacitado para brindar apoyo en higiene, alimentación y monitoreo general, pero no sustituye atención médica.</li>
        <li>Asumo la responsabilidad de comunicar cualquier malestar o síntoma inusual durante mi estadía.</li>
        <li>Entiendo que los resultados de mi cirugía dependerán del procedimiento realizado y de mi cumplimiento con las indicaciones médicas.</li>
        <li>Libero a Beauty Recovery Home y su personal de cualquier responsabilidad médica directa relacionada con mi cirugía.</li>
      </ul>

      <h4>Condiciones sobre uso del servicio:</h4>
      <ul>
        <li>Al realizar el pago y recibir los servicios (alojamiento, alimentos, asistencia u otros), el contrato se considera iniciado y no se realizarán reembolsos por salida anticipada o decisiones personales de la paciente.</li>
        <li>Una vez que la paciente es trasladada para su procedimiento quirúrgico, se considera que ha recibido el servicio completo correspondiente a su estadía hasta ese momento.</li>
      </ul>

      <h4>Confirmación de pago:</h4>
      <ul>
        <li>El pago realizado el día de llegada corresponde a los servicios ya brindados. No se reembolsará ninguna cantidad posterior por uso efectivo del servicio, salvo en casos extraordinarios evaluados por la administración.</li>
      </ul>

      <p><strong>Firma de la paciente:</strong></p>
      <div className="sig-box">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '200px', border: '1px solid #ced4da', borderRadius: '4px' }}
        />
        <button onClick={handleClear} className="btn btn-secondary">Borrar Firma</button>
        <button onClick={handleSave} className="btn btn-primary">Firmar y Guardar</button>
      </div>
    </div>
  );
}