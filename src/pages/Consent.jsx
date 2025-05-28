import React, { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabaseClient';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Heading,
  Text,
  UnorderedList,
  ListItem,
  Stack,
} from '@chakra-ui/react';

export default function Consent() {
  const [patientName, setPatientName] = useState('');
  const [lang, setLang] = useState('es'); // 'es' or 'en'
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const { id: patientId } = useParams();
  const navigate = useNavigate();

  const toggleLang = () => setLang(prev => (prev === 'es' ? 'en' : 'es'));

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
    navigate(-1);
  };

  return (
    <Box id="consent-container" p={4} maxW="800px" mx="auto">
      <Button size="sm" mb={4} onClick={toggleLang}>
        {lang === 'es' ? 'English' : 'Español'}
      </Button>
      <Heading as="h2" size="xl" mb={4}>
        {lang === 'es' ? 'Consentimiento Informado' : 'Informed Consent'}
      </Heading>
      <Text mb={4}>
        {lang === 'es'
          ? <>Yo, <Text as="span" fontWeight="bold">{patientName}</Text>, declaro haber sido informada y entender los siguientes puntos respecto a mi estadía en Beauty Recovery Home:</>
          : <>I, <Text as="span" fontWeight="bold">{patientName}</Text>, hereby declare that I have been informed and understand the following regarding my stay at Beauty Recovery Home:</>
        }
      </Text>
      <UnorderedList mb={6} spacing={2}>
        {lang === 'es'
          ? [
              'Entiendo que este es un centro de recuperación no médico, donde no se administran medicamentos ni se realizan procedimientos médicos.',
              'Me comprometo a seguir las indicaciones postoperatorias dadas por mi cirujano y notificarlas al personal de la casa en caso necesario.',
              'Reconozco que debo informar cualquier síntoma o complicación inmediatamente al personal de la casa.',
              'Acepto que la casa no se hace responsable por complicaciones médicas derivadas de mi procedimiento.',
              'Comprendo que debo mantener una conducta respetuosa y cumplir con las normas de convivencia del centro.',
              'Autorizo la toma de fotografías y videos para fines médicos y promocionales, respetando mi privacidad.',
              'Estoy consciente de que puedo retirar mi consentimiento en cualquier momento.',
              'Entiendo que cualquier información de salud personal que comparta con el personal será mantenida confidencial de acuerdo con la Ley de Portabilidad y Responsabilidad del Seguro de Salud (HIPAA), excepto cuando la divulgación sea requerida por ley o por mi seguridad inmediata.',
              'Beauty Recovery Home es una instalación de recuperación no médica. No se realizan diagnósticos clínicos, tratamientos ni servicios médicos de emergencia en el lugar. Cualquier medicamento debe haber sido recetado previamente por un proveedor médico autorizado. En caso de emergencia, se llamará al 911.',
              'Doy mi consentimiento para el uso de fotografías o videos tomados durante mi estancia con fines de seguimiento médico o promocionales. Mi identidad será protegida a menos que otorgue un permiso adicional y explícito por escrito. Entiendo que puedo retirar este consentimiento en cualquier momento.',
              'Autorizo a Beauty Recovery Home a contactar a mi persona de contacto de emergencia designada y compartir información relevante en caso de una emergencia.',
            ].map((text, i) => <ListItem key={i}>{text}</ListItem>)
          : [
              'I understand that this is a non-medical recovery facility where no medications are administered and no medical procedures are performed.',
              'I commit to following the post-operative instructions given by my surgeon and notifying the home staff if necessary.',
              'I acknowledge that I must report any symptoms or complications immediately to the home staff.',
              'I accept that the home is not responsible for medical complications arising from my procedure.',
              'I understand that I must maintain respectful behavior and comply with the facility\'s rules.',
              'I authorize the taking of photographs and videos for medical and promotional purposes, respecting my privacy.',
              'I am aware that I can withdraw my consent at any time.',
                'I understand that any personal health information I share with the staff will be kept confidential in accordance with the Health Insurance Portability and Accountability Act (HIPAA), except when disclosure is required by law or for my immediate safety',
                'Beauty Recovery Home is a non-medical recovery facility. No clinical diagnoses, treatments, or emergency medical services are provided on-site. Any medications must be previously prescribed by a licensed medical provider. In case of emergency, 911 will be called.',
                'I consent to the use of photographs or videos taken during my stay for medical tracking or promotional purposes. My identity will be protected unless I give additional, explicit permission in writing. I understand I may withdraw this consent at any time.',
                'I authorize Beauty Recovery Home to contact my designated emergency contact and share relevant information in case of an emergency.',



            ].map((text, i) => <ListItem key={i}>{text}</ListItem>)
        }
      </UnorderedList>
      <Box className="sig-box" mb={4}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '200px', border: '1px solid #ced4da', borderRadius: '4px' }}
        />
        <Stack direction="row" spacing={4} mt={2}>
          <Button onClick={handleClear} colorScheme="gray">Borrar Firma</Button>
          <Button onClick={handleSave} colorScheme="blue">Firmar y Guardar</Button>
        </Stack>
      </Box>
    </Box>
  );
}