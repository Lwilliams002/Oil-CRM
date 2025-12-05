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

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function AllPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    async function loadPatients() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Not authenticated');
        const url = `${API_BASE}/patients`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Failed to fetch patients (HTTP ${res.status}): ${txt.slice(0,180)}`);
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const txt = await res.text();
          throw new Error(`Expected JSON but got: ${txt.slice(0,180)}`);
        }
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : (data || []));
      } catch (err) {
        console.error('Error loading patients:', err);
      }
    }
    loadPatients();
  }, []);

  // Delete patient handler
  const handleDelete = async (id) => {
    console.log('[AllPatients] delete click for id:', id);
    if (!window.confirm('Are you sure you want to delete this patient?')) return;

    try {
      const { data, error } = await supabase
          .from('patients')
          .delete()
          .eq('id', id);

      console.log('[AllPatients] delete result:', { data, error });

      if (error) {
        console.error('Delete error:', error);
        alert('Could not delete patient: ' + error.message);
      } else {
        setPatients(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Delete threw exception:', err);
      alert('Could not delete patient (exception): ' + (err.message || String(err)));
    }
  };

  async function getAvatarUrl(profileKey) {
    if (!profileKey) return '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return '';
      const res = await fetch(`${API_BASE}/sign-download?objectKey=${encodeURIComponent(profileKey)}`, {
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