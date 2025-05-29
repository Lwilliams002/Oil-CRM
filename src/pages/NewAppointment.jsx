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
        apiKey: 'AIzaSyAk3dV3IQuyg3jX_M_6-1vBN-yDjXfgP4E',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      });
    });
    document.body.appendChild(script1);

    // Load Google Identity Services
    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = () => {
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: '742623411737-d4rr7ubqsbf9bvmvrbo9ia782okiehsf.apps.googleusercontent.com',
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
    // insert into supabase
    const record = {
      patient_id: form.patientId,
      appointment_time: form.timeSlot,
      entry_date: form.entryDate,
      surgery_date: form.surgeryDate,
      surgeon: form.surgeon,
      clinic: form.clinic,
      procedure: form.procedure,
      motif: form.motif
    };
    const { data, error } = await supabase
      .from('appointments')
      .insert([record])
      .select();
    if (error) {
      console.error('Insert appointment error:', error);
      alert('Could not save appointment: ' + error.message);
      return;
    }
    const rec = data[0];
    const patient = patients.find(p => p.id === rec.patient_id) || {};
    const patientName = `${patient.first_name} ${patient.last_name}`.trim();

    // parse date/time
    const [y, m, d] = rec.surgery_date.split('-').map(Number);
    const [h, min] = rec.appointment_time.split(':').map(Number);
    const start = new Date(y, m - 1, d, h, min);
    const end = new Date(y, m - 1, d, h, min + 30);

    pendingEvent.current = {
      summary: `Cita: ${patientName}`,
      location: rec.clinic,
      description: `Paciente: ${patientName}\nDr.: ${rec.surgeon}\nProcedimiento: ${rec.procedure}\nMotivo: ${rec.motif}`,
      start: { dateTime: start.toISOString(), timeZone: 'America/New_York' },
      end:   { dateTime: end.toISOString(),   timeZone: 'America/New_York' },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 24 * 60 }]
      }
    };

    // trigger Google consent and event insert
    tokenClient.current.requestAccessToken({ prompt: 'consent' });
    alert('Appointment saved and calendar event scheduled!');
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