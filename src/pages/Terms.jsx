import React, { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  UnorderedList,
  ListItem,
  Button,
  VStack,
  Container,
  Stack,
} from '@chakra-ui/react';

export default function Terms() {
  const [patientName, setPatientName] = useState('');
  const [lang, setLang] = useState('es');
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const {id: patientId} = useParams();
  const navigate = useNavigate();

  const t = {
    es: {
      title: 'Beauty Recovery Home – Consentimiento Informado y Guía de Servicios',
      intro: `Yo, ${patientName}, declaro haber sido informada y entender los siguientes puntos:`,
      servicesTitle: 'Servicios Incluidos',
      services: [
        'Alojamiento',
        'Alimentación saludable',
        'Asistencia general en higiene y movilidad',
        'Supervisión básica del estado general',
        'Soporte emocional',
        'Administración de medicamentos previamente indicados por un médico'
      ],
      rightsTitle: 'Derechos de la Paciente',
      rights: [
        'Recibir un trato digno, respetuoso y confidencial',
        'Estar informada sobre los servicios ofrecidos y sus limitaciones',
        'Expresar sugerencias o inquietudes libremente',
        'Decidir cuándo finalizar su estancia con aviso previo',
        'Tener privacidad en su habitación y proceso de recuperación'
      ],
      responsibilitiesTitle: 'Responsabilidades de la Paciente',
      responsibilities: [
        'Informar sobre condiciones médicas, alergias o antecedentes quirúrgicos',
        'Cumplir con las recomendaciones médicas',
        'Tratar con respeto al personal y a otras pacientes'
      ],
      disclaimer: 'Beauty Recovery Home – No consumir alcohol, drogas ni recibir visitas no autorizadas. Firmar el consentimiento antes del ingreso.',
      cancellationTitle: 'Política de Cancelación y Reembolsos',
      cancellation: [
        'No se realizan reembolsos una vez iniciado el servicio.',
        'Cancelaciones con menos de 48 horas no serán reembolsadas.',
        'Cancelaciones con más de 48 horas pueden aplicar a reembolso parcial.',
        'En caso de no presentarse, se pierde automáticamente el derecho a reembolso.'
      ],
      staffRightsTitle: 'Derechos y Responsabilidades del Personal',
      staffRights: [
        'Ser tratado con respeto por parte de las pacientes',
        'Negarse a realizar actividades fuera de su función',
        'Trabajar en un ambiente seguro',
        'Solicitar apoyo a la administración ante conflictos',
        'Recibir instrucciones claras sobre el estado de la paciente'
      ],
      staffRespTitle: 'Responsabilidades:',
      staffResp: [
        'Trato amable y empático',
        'Mantener confidencialidad'
      ],
      intimateTitle: 'Límites de la Asistencia en Higiene Íntima',
      intimate: 'El personal no está obligado a realizar higiene íntima completa salvo que exista una condición física que lo justifique médicamente. Se ofrecerá apoyo verbal o supervisión si la paciente requiere guía, respetando su autonomía y privacidad.',
      contactTitle: 'Contacto',
      contact: ['WhatsApp: +1 786-457-1328', 'Instagram: @beauty_recoveryhome', 'TikTok: beauty.recoveryho'],
      clear: 'Borrar Firma',
      save: 'Firmar y Guardar',
      langToggle: 'English'
    },
    en: {
      title: 'Beauty Recovery Home – Informed Consent and Service Guide',
      intro: `I, ${patientName}, hereby declare that I have been informed and understand the following regarding my stay at Beauty Recovery Home:`,
      servicesTitle: 'Included Services',
      services: [
        'Accommodation',
        'Healthy meals',
        'General hygiene and mobility assistance',
        'Basic health monitoring',
        'Emotional support',
        'Administration of medications previously prescribed by a physician'
      ],
      rightsTitle: 'Patient Rights',
      rights: [
        'To receive dignified, respectful, and confidential treatment',
        'To be informed about offered services and their limitations',
        'To freely express suggestions or concerns',
        'To decide when to end the stay with prior notice',
        'To have privacy in her room and recovery process'
      ],
      responsibilitiesTitle: 'Patient Responsibilities',
      responsibilities: [
        'Inform about medical conditions, allergies, or surgical history',
        'Follow medical recommendations',
        'Treat staff and other patients with respect'
      ],
      disclaimer: 'Beauty Recovery Home – Do not consume alcohol, drugs, or receive unauthorized visitors. Sign consent before admission.',
      cancellationTitle: 'Cancellation and Refund Policy',
      cancellation: [
        'No refunds once the service has begun.',
        'Cancellations under 48 hours will not be refunded.',
        'Cancellations over 48 hours may receive a partial refund.',
        'No-shows automatically forfeit refund rights.'
      ],
      staffRightsTitle: 'Staff Rights and Responsibilities',
      staffRights: [
        'To be treated respectfully by patients',
        'To refuse tasks outside their role',
        'To work in a safe environment',
        'To request administrative support in conflicts',
        'To receive clear instructions on patient status'
      ],
      staffRespTitle: 'Responsibilities:',
      staffResp: [
        'Provide kind and empathetic care',
        'Maintain confidentiality'
      ],
      intimateTitle: 'Limits of Intimate Hygiene Assistance',
      intimate: 'Staff are not required to provide full intimate hygiene unless medically justified. Verbal guidance or supervision will be offered respecting autonomy and privacy.',
      contactTitle: 'Contact',
      contact: ['WhatsApp: +1 786-457-1328', 'Instagram: @beauty_recoveryhome', 'TikTok: beauty.recoveryho'],
      clear: 'Clear Signature',
      save: 'Sign and Save',
      langToggle: 'Español'
    }
  };

  useEffect(() => {
    // Load patient name
    supabase
        .from('patients')
        .select('first_name, last_name')
        .eq('id', patientId)
        .single()
        .then(({data, error}) => {
          if (data) setPatientName(`${data.first_name} ${data.last_name}`);
        });

    // Initialize SignaturePad
    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {backgroundColor: 'rgba(255,255,255,1)'});
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
    return () => window.removeEventListener('resize', resize);
  }, [patientId]);

  const handleClear = () => sigPadRef.current?.clear();

  const handleSave = async () => {
    const pad = sigPadRef.current;
    if (!pad || pad.isEmpty()) {
      alert(lang === 'es' ? 'Por favor firme primero.' : 'Please sign first.');
      return;
    }
    // Render to canvas
    const element = document.getElementById('terms-container');
    const rendered = await html2canvas(element, {scale: 2});
    const imgData = rendered.toDataURL('image/png');

    // Build PDF
    const pdf = new jsPDF({unit: 'pt', format: 'letter', orientation: 'portrait'});
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    const props = pdf.getImageProperties(imgData);
    const imgHeight = (props.height * usableWidth) / props.width;

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

    const blob = pdf.output('blob');
    const timestamp = Date.now();
    const filePath = `documents/terms-${patientId}-${timestamp}.pdf`;
    const {data: uploadData, error: upErr} = await supabase
        .storage
        .from('patient-documents')
        .upload(filePath, blob, {upsert: true});
    if (upErr) {
      alert(lang === 'es' ? 'Error subiendo PDF de términos.' : 'Error uploading terms PDF.');
      return;
    }
    const {error: insErr} = await supabase
        .from('patient_documents')
        .insert({
          patient_id: patientId,
          template_key: 'terms',
          file_url: uploadData.path,
          file_type: 'pdf',
        });
    if (insErr) {
      alert(lang === 'es' ? 'Error registrando documento.' : 'Error registering document.');
      return;
    }
    alert(lang === 'es' ? 'Términos firmados y guardados.' : 'Terms signed and saved.');
    navigate(-1);
  };

  return (
      <Container maxW="container.md" id="terms-container" py={8}>
        <Button size="sm" alignSelf="flex-end" onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>
          {t[lang].langToggle}
        </Button>
        <VStack spacing={4} align="start">
          <Heading as="h3" size="lg">{t[lang].title}</Heading>
          <Text>
            {lang === 'es' ? 'Yo, ' : 'I, '}
            <Text as="strong" display="inline">{patientName}</Text>
            {lang === 'es' ? ', declaro haber sido informada y entender los siguientes puntos:' : ', hereby declare that I have been informed and understand the following regarding my stay at Beauty Recovery Home:'}
          </Text>

          <Heading as="h4" size="md">{t[lang].servicesTitle}</Heading>
          <UnorderedList ml={4}>
            {t[lang].services.map((item, idx) => <ListItem key={idx}>{item}</ListItem>)}
          </UnorderedList>

          <Heading as="h4" size="md">{t[lang].rightsTitle}</Heading>
          <UnorderedList ml={4}>
            {t[lang].rights.map((item, idx) => <ListItem key={idx}>{item}</ListItem>)}
          </UnorderedList>

          <Heading as="h4" size="md">{t[lang].responsibilitiesTitle}</Heading>
          <UnorderedList ml={4}>
            {t[lang].responsibilities.map((item, idx) => <ListItem key={idx}>{item}</ListItem>)}
          </UnorderedList>

          <Text>{t[lang].disclaimer}</Text>

          <Heading as="h4" size="md">{t[lang].cancellationTitle}</Heading>
          <UnorderedList ml={4}>
            {t[lang].cancellation.map((item, idx) => <ListItem key={idx}>{item}</ListItem>)}
          </UnorderedList>

          <Heading as="h4" size="md">{t[lang].staffRightsTitle}</Heading>
          <Text fontWeight="bold">{lang === 'es' ? 'Derechos:' : 'Rights:'}</Text>
          <UnorderedList ml={4}>
            {t[lang].staffRights.map((item, idx) => <ListItem key={idx}>{item}</ListItem>)}
          </UnorderedList>
          <Text fontWeight="bold">{t[lang].staffRespTitle}</Text>
          <UnorderedList ml={4}>
            {t[lang].staffResp.map((item, idx) => <ListItem key={idx}>{item}</ListItem>)}
          </UnorderedList>

          <Text>{lang === 'es' ? 'Beauty Recovery Home – Seguir protocolos de higiene y seguridad' : 'Beauty Recovery Home – Follow hygiene and safety protocols'}</Text>
          <Text>{lang === 'es' ? 'Reportar cualquier irregularidad' : 'Report any irregularities'}</Text>
          <Text>{lang === 'es' ? 'Cumplir tareas asignadas' : 'Complete assigned tasks'}</Text>
          <Text>{lang === 'es' ? 'No emitir diagnósticos médicos' : 'Do not give medical diagnoses'}</Text>

          <Heading as="h4" size="md">{t[lang].intimateTitle}</Heading>
          <Text>{t[lang].intimate}</Text>

          <Heading as="h4" size="md">{t[lang].contactTitle}</Heading>
          {t[lang].contact.map((item, idx) => <Text key={idx}>{item}</Text>)}

          <Box mt={8} className="sig-box">
            <canvas
                ref={canvasRef}
                style={{width: '100%', height: 200, border: '1px solid #ccc', borderRadius: 4}}
            />
            <Stack direction="row" spacing={4} mt={4}>
              <Button onClick={handleClear}>{t[lang].clear}</Button>
              <Button colorScheme="blue" onClick={handleSave}>{t[lang].save}</Button>
            </Stack>
          </Box>
        </VStack>
      </Container>
  );
}
