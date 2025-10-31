import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Box, Flex, Heading, Text, Button,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  List, ListItem, Input, Textarea, Stack, Link, Image
} from '@chakra-ui/react';

export default function PatientDetails() {
  const [patient, setPatient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [newLog, setNewLog] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [oxygenLevel, setOxygenLevel] = useState('');
  const [temperature, setTemperature] = useState('');
  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthday: '',
    marital_status: '',
    sex: '',
    blood_group: '',
    weight: '',
    height: '',
    address: '',
    history: ''
  });

  // Get patient id from route parameters and navigation
  const { id } = useParams();
  const navigate = useNavigate();

  async function getAvatarUrl(profileKey) {
    if (!profileKey) return '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return '';
      const r = await fetch(`/api/sign-download?objectKey=${encodeURIComponent(profileKey)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!r.ok) return '';
      const { url } = await r.json();
      return url;
    } catch (e) {
      console.error('avatar sign error', e);
      return '';
    }
  }

  async function refreshDocuments() {
    const { data: docsData, error: docsError } = await supabase
      .from('patient_documents')
      .select('id, created_at, original_filename, content_type, size_bytes, status, object_key, file_url')
      .eq('patient_id', id)
      .order('created_at', { ascending: false });
    if (docsError) {
      console.error('Error fetching documents:', docsError);
    } else {
      setDocuments(docsData || []);
    }
  }

  async function openDocumentById(docId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');

      const r = await fetch(`/api/sign-download?docId=${encodeURIComponent(docId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || 'Failed to sign download');
      }
      const { url } = await r.json();
      window.open(url, '_blank');
    } catch (e) {
      console.error('Download error:', e);
      alert(e.message || String(e));
    }
  }

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      // Fetch patient data
      let { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (patientError) {
        console.error('Error fetching patient:', patientError);
      } else {
        setPatient(patientData);
      }

      // Fetch documents
      await refreshDocuments();

      // Fetch logs
      let { data: logsData, error: logsError } = await supabase
        .from('patient_logs')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      if (logsError) {
        console.error('Error fetching logs:', logsError);
      } else {
        setLogs(logsData);
      }
    }

    fetchData();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!patient?.profile_url) {
        setAvatarUrl('');
        return;
      }
      const url = await getAvatarUrl(patient.profile_url);
      setAvatarUrl(url);
    })();
  }, [patient?.profile_url]);

  useEffect(() => {
    if (!patient) return;
    setEdit({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      email: patient.email || '',
      phone: patient.phone || '',
      birthday: patient.birthday ? new Date(patient.birthday).toISOString().slice(0,10) : '',
      marital_status: patient.marital_status || '',
      sex: patient.sex || '',
      blood_group: patient.blood_group || '',
      weight: patient.weight ?? '',
      height: patient.height ?? '',
      address: patient.address || '',
      history: patient.history || ''
    });
  }, [patient]);

  const openConsent = () => {
    navigate(`/consent/${id}`);
  };

  const openTerms = () => {
    navigate(`/terms/${id}`);
  };

  const handleAddDocumentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  const startEdit = () => setIsEditing(true);
  const cancelEdit = () => {
    // reset from current patient values and exit edit mode
    if (patient) {
      setEdit({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        birthday: patient.birthday ? new Date(patient.birthday).toISOString().slice(0,10) : '',
        marital_status: patient.marital_status || '',
        sex: patient.sex || '',
        blood_group: patient.blood_group || '',
        weight: patient.weight ?? '',
        height: patient.height ?? '',
        address: patient.address || '',
        history: patient.history || ''
      });
    }
    setIsEditing(false);
  };

  async function saveEdit() {
    try {
      const payload = { ...edit };
      // normalize empty strings to null where appropriate
      ['email','phone','marital_status','sex','blood_group','address','history'].forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      if (payload.birthday === '') payload.birthday = null;
      // weight/height numeric normalization
      if (payload.weight === '') payload.weight = null; else payload.weight = Number(payload.weight);
      if (payload.height === '') payload.height = null; else payload.height = Number(payload.height);

      const { error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', id);
      if (error) throw error;

      // refresh local patient state to reflect saved values
      setPatient(prev => prev ? { ...prev, ...payload } : prev);
      setIsEditing(false);
      alert('Patient details saved.');
    } catch (e) {
      console.error('Save patient error:', e);
      alert('Could not save patient: ' + (e.message || String(e)));
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');

      // 1) Ask server for a presigned PUT and create a pending DB row
      const signResp = await fetch('/api/sign-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          patientId: id
        })
      }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));

      // 2) PUT directly to Wasabi using the provided uploadUrl
      const put = await fetch(signResp.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!put.ok) throw new Error('Upload failed');

      // 3) Finalize the DB record (mark as stored, save size)
      await fetch('/api/finalize-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ docId: signResp.docId, sizeBytes: file.size })
      }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));

      // 4) Refresh list
      await refreshDocuments();
    } catch (err) {
      console.error('Document upload error:', err);
      alert('Error uploading document: ' + (err.message || String(err)));
    }
  };

  const toggleLogForm = () => {
    setShowLogForm(!showLogForm);
  };

  const handleLogChange = (e) => {
    setNewLog(e.target.value);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!newLog.trim()) return;

    const {error: insertError} = await supabase
        .from('patient_logs')
        .insert([{
          patient_id: id,
          entry: newLog,
          blood_pressure: bloodPressure,
          oxygen_level: oxygenLevel,
          temperature: temperature
        }]);

    if (insertError) {
      console.error('Error inserting log:', insertError);
      alert('Error adding log');
      return;
    }

    setNewLog('');
    setBloodPressure('');
    setOxygenLevel('');
    setTemperature('');
    setShowLogForm(false);

    // Refresh logs
    const {data: logsData, error: logsError} = await supabase
        .from('patient_logs')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', {ascending: false});

    if (logsError) {
      console.error('Error fetching logs:', logsError);
    } else {
      setLogs(logsData);
    }
  };

  if (!patient) {
    return (
        <Box p={8}>
          <Text fontSize="xl">Loading patient data...</Text>
        </Box>
    );
  }

  return (
      <Flex direction="column" p={8}>
        {patient.profile_url && (
          <Box mb={4} textAlign="center">
            <Image
              src={avatarUrl}
              alt={`${patient.first_name} ${patient.last_name}`}
              boxSize="150px"
              objectFit="cover"
              borderRadius="full"
              mx="auto"
            />
          </Box>
        )}
        <Heading mb={4}>
          {patient.first_name} {patient.last_name} (ID: {patient.id})
        </Heading>

        <Flex gap={8} flexWrap="wrap">
          <Box flex="1" minW="300px">
            <Flex align="center" justify="space-between" mb={4}>
              <Heading size="md">Patient Information</Heading>
              {!isEditing ? (
                <Button size="sm" colorScheme="blue" onClick={startEdit}>Edit</Button>
              ) : (
                <Stack direction="row" spacing={2}>
                  <Button size="sm" colorScheme="green" onClick={saveEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </Stack>
              )}
            </Flex>
            {!isEditing ? (
              <TableContainer mb={4}>
                <Table variant="simple" size="sm">
                  <Tbody>
                    <Tr><Th>First Name</Th><Td>{patient.first_name}</Td></Tr>
                    <Tr><Th>Last Name</Th><Td>{patient.last_name}</Td></Tr>
                    <Tr><Th>Email</Th><Td>{patient.email || '—'}</Td></Tr>
                    <Tr><Th>Phone</Th><Td>{patient.phone || '—'}</Td></Tr>
                    <Tr><Th>Date of Birth</Th><Td>{patient.birthday ? new Date(patient.birthday).toLocaleDateString() : '—'}</Td></Tr>
                    <Tr><Th>Marital Status</Th><Td>{patient.marital_status || '—'}</Td></Tr>
                    <Tr><Th>Gender</Th><Td>{patient.sex || '—'}</Td></Tr>
                    <Tr><Th>Blood Type</Th><Td>{patient.blood_group || '—'}</Td></Tr>
                    <Tr><Th>Weight</Th><Td>{patient.weight ?? '—'}</Td></Tr>
                    <Tr><Th>Height</Th><Td>{patient.height ?? '—'}</Td></Tr>
                    <Tr><Th>Address</Th><Td>{patient.address || '—'}</Td></Tr>
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <Stack spacing={3} mb={4}>
                <Stack direction={["column","row"]} spacing={3}>
                  <Input placeholder="First Name" value={edit.first_name} onChange={e => setEdit(v => ({...v, first_name: e.target.value}))} />
                  <Input placeholder="Last Name" value={edit.last_name} onChange={e => setEdit(v => ({...v, last_name: e.target.value}))} />
                </Stack>
                <Stack direction={["column","row"]} spacing={3}>
                  <Input type="email" placeholder="Email" value={edit.email} onChange={e => setEdit(v => ({...v, email: e.target.value}))} />
                  <Input placeholder="Phone" value={edit.phone} onChange={e => setEdit(v => ({...v, phone: e.target.value}))} />
                </Stack>
                <Stack direction={["column","row"]} spacing={3}>
                  <Input type="date" placeholder="Birthday" value={edit.birthday} onChange={e => setEdit(v => ({...v, birthday: e.target.value}))} />
                  <Input placeholder="Marital Status" value={edit.marital_status} onChange={e => setEdit(v => ({...v, marital_status: e.target.value}))} />
                </Stack>
                <Stack direction={["column","row"]} spacing={3}>
                  <Input placeholder="Gender" value={edit.sex} onChange={e => setEdit(v => ({...v, sex: e.target.value}))} />
                  <Input placeholder="Blood Type (e.g., A+, O-)" value={edit.blood_group} onChange={e => setEdit(v => ({...v, blood_group: e.target.value}))} />
                </Stack>
                <Stack direction={["column","row"]} spacing={3}>
                  <Input type="number" placeholder="Weight" value={edit.weight} onChange={e => setEdit(v => ({...v, weight: e.target.value}))} />
                  <Input type="number" placeholder="Height" value={edit.height} onChange={e => setEdit(v => ({...v, height: e.target.value}))} />
                </Stack>
                <Textarea placeholder="Address" rows={3} value={edit.address} onChange={e => setEdit(v => ({...v, address: e.target.value}))} />
              </Stack>
            )}
            <Heading size="sm" mt={4} mb={2}>Other Details</Heading>
            {!isEditing ? (
              <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50" whiteSpace="pre-wrap">
                {patient.history || '—'}
              </Box>
            ) : (
              <Textarea rows={4} value={edit.history} onChange={e => setEdit(v => ({...v, history: e.target.value}))} />
            )}

            <Stack direction="row" spacing={4}>
              <Button colorScheme="blue" onClick={openConsent}>
                Open Consent
              </Button>
              <Button colorScheme="gray" onClick={openTerms}>
                Open Terms
              </Button>
            </Stack>
          </Box>

          <Box flex="1" minW="300px">
            <Heading size="md" mb={4}>Documents</Heading>
            {documents.length === 0 ? (
                <Text mb={4}>No documents uploaded.</Text>
            ) : (
                <List spacing={2} mb={4}>
                  {documents.map((doc) => {
                    const name = doc.original_filename
                      || (doc.object_key ? String(doc.object_key).split('/').pop() : '')
                      || (doc.file_url ? String(doc.file_url).split('/').pop() : 'document');

                    return (
                      <ListItem key={doc.id}>
                        <Button size="sm" variant="link" colorScheme="blue" onClick={() => openDocumentById(doc.id)}>
                          {name}
                        </Button>
                        <Text as="span" ml={2} color="gray.500" fontSize="sm">
                          {doc.size_bytes ? `• ${(doc.size_bytes/1024).toFixed(1)} KB` : ''} {doc.status && doc.status !== 'stored' ? `• ${doc.status}` : ''}
                        </Text>
                      </ListItem>
                    );
                  })}
                </List>
            )}
            <Button colorScheme="green" onClick={handleAddDocumentClick} mb={2}>
              Add Document
            </Button>
            <Input
                type="file"
                ref={fileInputRef}
                display="none"
                onChange={handleFileChange}
            />
          </Box>
        </Flex>

        <Box mt={8}>
          <Heading size="md" mb={4}>Change Log</Heading>
          {logs.length === 0 ? (
              <Text mb={4}>No logs available.</Text>
          ) : (
              <List spacing={3} mb={4}>
                {logs.map((log) => (
                    <ListItem key={log.id} borderWidth="1px" borderRadius="md" p={3}>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        {new Date(log.created_at).toLocaleString()}
                      </Text>
                      <Text mb={2}>{log.entry}</Text>
                      <Text fontSize="sm">BP: {log.blood_pressure || '—'} | O₂: {log.oxygen_level ?? '—'}% |
                        Temp: {log.temperature ?? '—'}°C</Text>
                    </ListItem>
                ))}
              </List>
          )}
          {!showLogForm && (
              <Button colorScheme="blue" onClick={toggleLogForm}>
                Add Log Entry
              </Button>
          )}
          {showLogForm && (
              <Box as="form" onSubmit={handleLogSubmit} mt={4}>
                <Textarea
                    value={newLog}
                    onChange={handleLogChange}
                    placeholder="Enter log entry"
                    mb={3}
                    rows={3}
                    isRequired
                />
                <Stack direction={["column", "row"]} spacing={4} mb={3}>
                  <Input
                      placeholder="Blood Pressure (e.g. 120/80)"
                      value={bloodPressure}
                      onChange={e => setBloodPressure(e.target.value)}
                  />
                  <Input
                      placeholder="Oxygen Level (%)"
                      type="number"
                      value={oxygenLevel}
                      onChange={e => setOxygenLevel(e.target.value)}
                  />
                  <Input
                      placeholder="Temperature (°F)"
                      type="number"
                      value={temperature}
                      onChange={e => setTemperature(e.target.value)}
                  />
                </Stack>
                <Stack direction="row" spacing={4}>
                  <Button type="submit" colorScheme="green">
                    Save Log
                  </Button>
                  <Button type="button" onClick={toggleLogForm} colorScheme="gray">
                    Cancel
                  </Button>
                </Stack>
              </Box>
          )}
        </Box>
      </Flex>
  );
}
