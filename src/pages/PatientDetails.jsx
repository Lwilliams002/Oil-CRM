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

  // Get patient id from route parameters and navigation
  const { id } = useParams();
  const navigate = useNavigate();

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
      let { data: docsData, error: docsError } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', id);

      if (docsError) {
        console.error('Error fetching documents:', docsError);
      } else {
        setDocuments(docsData);
      }

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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Upload file to supabase storage
    try {
      // 1. Upload file to Supabase Storage
      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, '_');
      const filePath = `${id}/${timestamp}_${safeName}`;
      const {data: uploadData, error: uploadError} = await supabase
          .storage
          .from('patient-documents')
          .upload(filePath, file);
      if (uploadError) {
        console.error('Error fetching patient:', uploadError);
        alert(uploadError);
        return;
      }
      // 2. Insert metadata into patient_documents (requires template_key)
      const {error: insertError} = await supabase
          .from('patient_documents')
          .insert([{
            patient_id: id,
            template_key: 'custom',      // or use a more appropriate key
            file_url: uploadData.path,
            file_type: file.name.split('.').pop().toLowerCase()
          }]);
      if (insertError) throw insertError;

      // 3. Refresh documents list
      const {data: docsData, error: docsError} = await supabase
          .from('patient_documents')
          .select('*')
          .eq('patient_id', id);
      if (docsError) throw docsError;
      setDocuments(docsData);
    } catch (err) {
      console.error('Document upload/insert error:', err);
      alert('Error handling document: ' + err.message);
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
              src={supabase
                    .storage
                    .from('patient-photos')
                    .getPublicUrl(patient.profile_url)
                    .data.publicUrl}
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
            <Heading size="md" mb={4}>Patient Information</Heading>
            <TableContainer mb={4}>
              <Table variant="simple" size="sm">
                <Tbody>
                  <Tr>
                    <Th>First Name</Th>
                    <Td>{patient.first_name}</Td>
                  </Tr>
                  <Tr>
                    <Th>Last Name</Th>
                    <Td>{patient.last_name}</Td>
                  </Tr>
                  <Tr>
                    <Th>Email</Th>
                    <Td>{patient.email}</Td>
                  </Tr>
                  <Tr>
                    <Th>Phone</Th>
                    <Td>{patient.phone}</Td>
                  </Tr>
                  <Tr>
                    <Th>Date of Birth</Th>
                    <Td>{patient.birthday ? new Date(patient.birthday).toLocaleDateString() : '—'}</Td>
                  </Tr>
                </Tbody>
              </Table>
            </TableContainer>

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
                    // get a publicly accessible URL for each file
                    const {data: {publicUrl}, error: urlError} = supabase
                        .storage
                        .from('patient-documents')
                        .getPublicUrl(doc.file_url);
                    if (urlError) console.error('Error generating public URL:', urlError);

                    return (
                        <ListItem key={doc.id}>
                          <Link href={publicUrl} isExternal color="blue.500">
                            {doc.file_url.split('/').pop()}
                          </Link>
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
                      <Text mb={2}>{log.log}</Text>
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
