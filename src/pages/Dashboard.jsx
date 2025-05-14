import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Badge,
  Heading,
  Text,
  Container
} from '@chakra-ui/react';

export default function Dashboard() {
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [patientsMap, setPatientsMap] = useState({});

  useEffect(() => {
    // Fetch counts
    async function fetchCounts() {
      const { count: apptCount, error: apptErr } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });
      if (!apptErr) setTotalAppointments(apptCount);

      const { count: patientsCount, error: patErr } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });
      if (!patErr) setTotalPatients(patientsCount);
    }

    // Fetch patient map
    async function fetchPatients() {
      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone, address');
      if (!error) {
        const map = {};
        patients.forEach(p => {
          map[p.id] = {
            name: `${p.first_name} ${p.last_name}`,
            phone: p.phone || '—',
            address: p.address || '—'
          };
        });
        setPatientsMap(map);
      }
    }

    // Fetch appointments
    async function fetchAppointments() {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, surgery_date, patient_id, status')
        .order('surgery_date', { ascending: false });
      if (!error) setAppointments(data);
    }

    fetchCounts();
    fetchPatients();
    fetchAppointments();
  }, []);

  const deleteAppointment = async id => {
    if (!window.confirm('Delete this appointment?')) return;
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    if (error) {
      alert('Could not delete appointment: ' + error.message);
    } else {
      setAppointments(apps => apps.filter(a => a.id !== id));
    }
  };

  const completeAppointment = async id => {
    if (!window.confirm('Mark this appointment as completed?')) return;
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', id);
    if (error) {
      alert('Could not update status: ' + error.message);
    } else {
      setAppointments(apps =>
        apps.map(a => (a.id === id ? { ...a, status: 'completed' } : a))
      );
    }
  };

  return (
    <Container maxW="container.xl" py={6}>
      <Box mb={6}>
        <Heading size="lg" mb={1}>
          Good morning <Text as="span" color="blue.500" className="names" />
        </Heading>
        <Text>Beauty Recovery Home | Dashboard</Text>
      </Box>

      <StatGroup
        mb={8}
        spacing={{ base: 4, md: 6 }}
        direction={{ base: 'column', md: 'row' }}
        alignItems="stretch"
      >
        <Stat>
          <StatLabel>Total Appointments</StatLabel>
          <StatNumber>{totalAppointments}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Total Patients</StatLabel>
          <StatNumber>{totalPatients}</StatNumber>
        </Stat>
      </StatGroup>

      <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
        <Box overflowX="auto" w="100%">
          <Table variant="simple" size="md" w="100%">
          <Thead bg="gray.100">
            <Tr>
              <Th>Time</Th>
              <Th>Surgery Date</Th>
              <Th>Patient</Th>
              <Th>Address</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {appointments.map(a => {
              const p = patientsMap[a.patient_id] || {};
              return (
                <Tr key={a.id}>
                  <Td>{a.appointment_time}</Td>
                  <Td>{a.surgery_date}</Td>
                  <Td>{p.name || 'Unknown'}</Td>
                  <Td>{p.address}</Td>
                  <Td>{p.phone}</Td>
                  <Td>
                    <Badge colorScheme={a.status === 'completed' ? 'green' : 'blue'}>
                      {a.status === 'completed' ? 'Completed' : 'Scheduled'}
                    </Badge>
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => completeAppointment(a.id)}
                      isDisabled={a.status === 'completed'}
                      mr={2}
                    >
                      ✔
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      onClick={() => deleteAppointment(a.id)}
                    >
                      🗑
                    </Button>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
        </Box>
      </Box>
    </Container>
  );
}