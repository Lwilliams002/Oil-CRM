import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  IconButton,
  Heading,
  Flex
} from '@chakra-ui/react';
import { FaEye, FaTrash } from 'react-icons/fa';

export default function AllPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    async function loadPatients() {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('last_name', { ascending: true });
        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        console.error('Error loading patients:', err);
      }
    }
    loadPatients();
  }, []);

  // Delete patient handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      alert('Could not delete patient: ' + error.message);
    } else {
      setPatients(patients.filter(p => p.id !== id));
    }
  };

  async function getAvatarUrl(profileKey) {
    if (!profileKey) return '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return '';
      const res = await fetch(`/api/sign-download?objectKey=${encodeURIComponent(profileKey)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return '';
      const { url } = await res.json();
      return url;
    } catch {
      return '';
    }
  }

  // Helper to render a patient row (so hooks are not used in map)
  function PatientRow({ p }) {
    const [avatarUrl, setAvatarUrl] = useState('');
    useEffect(() => {
      (async () => {
        const url = await getAvatarUrl(p.profile_url);
        setAvatarUrl(url);
      })();
    }, [p.profile_url]);

    return (
      <Tr key={p.id}>
        <Td>
          <Avatar
            size="sm"
            src={avatarUrl}
            name={`${p.first_name} ${p.last_name}`}
          />
        </Td>
        <Td>{p.first_name}</Td>
        <Td>{p.last_name}</Td>
        <Td>
          <IconButton
            aria-label="View"
            icon={<FaEye />}
            size="sm"
            mr={2}
            onClick={() => navigate(`/patient-details/${p.id}`)}
          />
          <IconButton
            aria-label="Delete"
            icon={<FaTrash />}
            size="sm"
            onClick={() => handleDelete(p.id)}
          />
        </Td>
      </Tr>
    );
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">All Patients</Heading>
      </Flex>
      <TableContainer>
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th>Photo</Th>
              <Th>First Name</Th>
              <Th>Last Name</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {patients.map(p => (
              <PatientRow key={p.id} p={p} />
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}