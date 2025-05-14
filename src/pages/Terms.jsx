import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignaturePad from 'signature_pad';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabaseClient';
import {
  Box,
  Button,
  Heading,
  Text,
  UnorderedList,
  ListItem,
  VStack,
} from '@chakra-ui/react';

export default function Terms() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('id');
  const [patientName, setPatientName] = useState('');
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!patientId) return;

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
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255,255,255,1)',
    });
    sigPadRef.current = signaturePad;

    function resizeCanvas() {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      signaturePad.clear();
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [patientId]);

  const clearSignature = () => {
    sigPadRef.current && sigPadRef.current.clear();
  };

  const saveSignature = async () => {
    const signaturePad = sigPadRef.current;
    if (!signaturePad || signaturePad.isEmpty()) {
      alert('Por favor firme primero.');
      return;
    }

    // Render terms container to canvas
    const el = containerRef.current;
    const canvasEl = await html2canvas(el, { scale: 2 });
    const imgData = canvasEl.toDataURL('image/png');

    // Create PDF
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * usableWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (imgHeight > pageHeight - margin * 2) {
      pdf.addPage();
      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin - (pageHeight - margin * 2),
        usableWidth,
        imgHeight
      );
    }

    const pdfBlob = pdf.output('blob');
    const filePath = `signed/${patientId}/Terms-${Date.now()}.pdf`;

    // Upload PDF to Supabase Storage
    const { data: uploadData, error: uploadErr } = await supabase
      .storage
      .from('patient-documents')
      .upload(filePath, pdfBlob, { upsert: true });
    if (uploadErr) {
      console.error(uploadErr);
      alert('Error subiendo PDF.');
      return;
    }

    // Record in database
    const { error: dbErr } = await supabase
      .from('patient_documents')
      .insert({
        patient_id: patientId,
        template_key: 'terms',
        file_url: uploadData.path,
        file_type: 'pdf',
      });
    if (dbErr) {
      console.error(dbErr);
      alert('Error registrando documento.');
      return;
    }

    alert('Términos firmados y guardados.');
  };

  return (
    <Box p={4} maxW="800px" mx="auto" ref={containerRef}>
      <VStack spacing={4} align="stretch">
        <Heading size="lg">
          Beauty Recovery Home – Consentimiento Informado y Guía de Servicios
        </Heading>
        <Text>
          Yo, <strong>{patientName}</strong>, declaro haber sido informada y entender los siguientes puntos:
        </Text>
        <Text fontWeight="bold">Servicios Incluidos</Text>
        <UnorderedList pl={4}>
          <ListItem>Alojamiento</ListItem>
          <ListItem>Alimentación saludable</ListItem>
          <ListItem>Asistencia general en higiene y movilidad</ListItem>
          <ListItem>Supervisión básica del estado general</ListItem>
          <ListItem>Soporte emocional</ListItem>
          <ListItem>Administración de medicamentos previamente indicados</ListItem>
        </UnorderedList>
        <Text fontWeight="bold">Derechos de la Paciente</Text>
        <UnorderedList pl={4}>
          <ListItem>Recibir trato digno, respetuoso y confidencial</ListItem>
          <ListItem>Estar informada sobre límites y servicios</ListItem>
          <ListItem>Expresar sugerencias o inquietudes</ListItem>
          <ListItem>Decidir salida con aviso previo</ListItem>
          <ListItem>Tener privacidad en su habitación</ListItem>
        </UnorderedList>
        <Text fontWeight="bold">Responsabilidades de la Paciente</Text>
        <UnorderedList pl={4}>
          <ListItem>Informar condiciones médicas y alergias</ListItem>
          <ListItem>Cumplir recomendaciones médicas</ListItem>
          <ListItem>Tratar con respeto al personal y otras pacientes</ListItem>
        </UnorderedList>
        <Text>
          Reconozco que la casa no es clínica médica; en emergencia se solicitará atención externa.
        </Text>
        <Text fontWeight="bold">Política de Cancelación y Reembolsos</Text>
        <UnorderedList pl={4}>
          <ListItem>No reembolsos una vez iniciado el servicio.</ListItem>
          <ListItem>Cancelaciones &lt; 48h: no reembolsos.</ListItem>
          <ListItem>Cancelaciones &gt; 48h: reembolso parcial posible.</ListItem>
        </UnorderedList>
        <Box mt={6}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '200px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </Box>
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button mr={3} onClick={clearSignature}>
            Borrar Firma
          </Button>
          <Button colorScheme="blue" onClick={saveSignature}>
            Firmar y Guardar
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}