import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Select,
  Input,
  Textarea,
  Button,
  Heading,
  Spacer,
  useToast
} from '@chakra-ui/react';
import { supabase } from '../supabaseClient';

const NewAppointment = () => {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({
    timeSlot: '',
    patientId: '',
    entryDate: '',
    surgeryDate: '',
    surgeon: '',
    clinic: '',
    procedure: '',
    motif: ''
  });
  const toast = useToast();
  const tokenClient = useRef(null);
  const pendingEvent = useRef(null);

  // Initialize Google APIs once
  useEffect(() => {
    // Fetch patients
    async function loadPatients() {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone, address');
      if (error) {
        console.error('Error loading patients:', error);
        return;
      }
      setPatients(data);
    }
    loadPatients();

    // Load gapi client
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.onload = () => window.gapi.load('client', async () => {
      await window.gapi.client.init({
        apiKey: 'AIzaSyAn2VjH6S102h9-Va-NFV76c336-FMK_CM',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      });
    });
    document.body.appendChild(script1);

    // Load Google Identity Services
    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = () => {
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: '260971628736-e9cei969isk562anh9ukesidj0s3vs3t.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Token error:', tokenResponse);
            return;
          }
          // Insert the pending event
          window.gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: pendingEvent.current
          }).then(res => {
            console.log('Calendar event created:', res);
            window.location.reload();
          }).catch(err => console.error('Calendar insert error:', err));
        }
      });
    };
    document.body.appendChild(script2);
  }, []);

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // Basic validation
    if (!form.patientId || !form.timeSlot || !form.surgeryDate) {
      toast({
        title: 'Datos incompletos',
        description: 'Selecciona paciente, fecha de cirugía y hora.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    // 1) Insert appointment into Supabase
    const record = {
      patient_id: form.patientId,
      appointment_time: form.timeSlot,
      entry_date: form.entryDate || null,
      surgery_date: form.surgeryDate || null,
      surgeon: form.surgeon || null,
      clinic: form.clinic || null,
      procedure: form.procedure || null,
      motif: form.motif || null,
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('Insert appointment error:', error);
      toast({
        title: 'No se pudo guardar la cita',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const rec = data;
    const patient = patients.find(p => p.id === rec.patient_id) || {};
    const patientName =
      `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente';

    // 2) Build Google Calendar event only if we have date & time
    if (!rec.surgery_date || !rec.appointment_time) {
      toast({
        title: 'Cita guardada',
        description:
          'La cita se guardó, pero no se pudo crear el evento en el calendario (fecha u hora faltante).',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const [y, m, d] = rec.surgery_date.split('-').map(Number);
    const [h, min] = rec.appointment_time.split(':').map(Number);
    const start = new Date(y, m - 1, d, h, min);
    const end = new Date(y, m - 1, d, h, (min || 0) + 30);

    pendingEvent.current = {
      summary: `Cita: ${patientName}`,
      location: rec.clinic || '',
      description: `Paciente: ${patientName}\nDr.: ${rec.surgeon || ''}\nProcedimiento: ${rec.procedure || ''}\nMotivo: ${rec.motif || ''}`,
      start: { dateTime: start.toISOString(), timeZone: 'America/Los_Angeles' },
      end: { dateTime: end.toISOString(), timeZone: 'America/Los_Angeles' },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 24 * 60 }],
      },
    };

    // 3) If Google Calendar client isn't ready, just save the appointment
    if (!tokenClient.current || !window.gapi || !window.gapi.client) {
      console.warn('Google Calendar no está listo, solo se guardó la cita.');
      toast({
        title: 'Cita guardada',
        description:
          'La cita se guardó, pero Google Calendar aún no está configurado o cargado.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      // Reset form
      setForm({
        timeSlot: '',
        patientId: '',
        entryDate: '',
        surgeryDate: '',
        surgeon: '',
        clinic: '',
        procedure: '',
        motif: '',
      });
      return;
    }

    // 4) Trigger Google consent and event insert
    tokenClient.current.requestAccessToken({ prompt: 'consent' });

    toast({
      title: 'Cita guardada',
      description: 'Se guardó la cita y se está creando el evento en Google Calendar.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });

    // Reset form after saving
    setForm({
      timeSlot: '',
      patientId: '',
      entryDate: '',
      surgeryDate: '',
      surgeon: '',
      clinic: '',
      procedure: '',
      motif: '',
    });
  };

  return (
    <Box p={6}>
      <Heading mb={4}>New Appointment</Heading>
      <Box as="form" onSubmit={handleSubmit}>
        <Flex wrap="wrap" spacing={4}>
          <Box flex="1" minW="250px" p={2}>
            <FormControl id="timeSlot" isRequired mb={3}>
              <FormLabel>Time Slot</FormLabel>
              <Input
                type="time"
                name="timeSlot"
                value={form.timeSlot}
                onChange={handleChange}
                step="1800"            // 1800 seconds = 30 minutes
                placeholder="HH:MM"
              />
            </FormControl>
            <FormControl id="patientId" isRequired mb={3}>
              <FormLabel>Patient</FormLabel>
              <Select name="patientId" value={form.patientId} onChange={handleChange}>
                <option value="">Select Patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box flex="1" minW="250px" p={2}>
            <FormControl id="entryDate" mb={3}>
              <FormLabel>Fecha de Entrada</FormLabel>
              <Input type="date" name="entryDate" value={form.entryDate} onChange={handleChange} />
            </FormControl>
            <FormControl id="surgeryDate" mb={3}>
              <FormLabel>Fecha de Cirugía</FormLabel>
              <Input type="date" name="surgeryDate" value={form.surgeryDate} onChange={handleChange} />
            </FormControl>
          </Box>
          <Box flex="1" minW="250px" p={2}>
            <FormControl id="surgeon" mb={3}>
              <FormLabel>Dr. que la opera</FormLabel>
              <Input type="text" name="surgeon" value={form.surgeon} onChange={handleChange} />
            </FormControl>
            <FormControl id="clinic" mb={3}>
              <FormLabel>Clínica</FormLabel>
              <Input type="text" name="clinic" value={form.clinic} onChange={handleChange} />
            </FormControl>
          </Box>
          <Box flex="1" minW="100%" p={2}>
            <FormControl id="procedure" mb={3}>
              <FormLabel>Procedimiento</FormLabel>
              <Input type="text" name="procedure" value={form.procedure} onChange={handleChange} />
            </FormControl>
            <FormControl id="motif" mb={3}>
              <FormLabel>Motivo</FormLabel>
              <Textarea name="motif" value={form.motif} onChange={handleChange} rows={3} />
            </FormControl>
          </Box>
        </Flex>
        <Flex mt={4} justify="flex-end">
          <Button colorScheme="blue" type="submit">Save Appointment</Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default NewAppointment;