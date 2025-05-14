

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Button,
  Image,
  Stack,
  VStack,
} from '@chakra-ui/react';

export default function NewPatient() {
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState(null);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    // 1) Upload photo
    const photoFile = formData.get('patientPhoto');
    let profileUrl = null;
    if (photoFile && photoFile.name) {
      const { data: photoData, error: photoErr } = await supabase
        .storage
        .from('patient-photos')
        .upload(`photos/${Date.now()}_${photoFile.name}`, photoFile);
      if (photoErr) {
        console.error('Photo upload error:', photoErr);
      } else {
        profileUrl = photoData.path;
      }
    }

    // 2) Insert patient record
    const record = {
      first_name: formData.get('firstName'),
      last_name: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('mobile'),
      birthday: formData.get('birthday'),
      marital_status: formData.get('maritalStatus'),
      sex: formData.get('sex'),
      blood_group: formData.get('bloodGroup'),
      weight: formData.get('weight'),
      height: formData.get('height'),
      address: formData.get('address'),
      history: formData.get('history'),
      profile_url: profileUrl,
    };

    const { data, error } = await supabase
      .from('patients')
      .insert([record])
      .select();

    if (error) {
      console.error('Patient insert failed:', error);
      alert('Could not save patient: ' + error.message);
      return;
    }
    const patientId = data[0]?.id;
    if (!patientId) {
      alert('Patient created but no ID returned.');
      return;
    }

    // 3) Upload documents
    const docFiles = formData.getAll('patientDocuments');
    for (const file of docFiles) {
      if (!file || !file.name) continue;
      const timestamp = Date.now();
      const safeName = file.name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_.-]/g, '');
      const filePath = `documents/${timestamp}_${safeName}`;

      const { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from('patient-documents')
        .upload(filePath, file);
      if (uploadErr) {
        console.error('Document upload error:', uploadErr);
        continue;
      }
      const storedPath = uploadData.path || uploadData.Key;
      const fileType = safeName.split('.').pop().toLowerCase();
      const { error: insertErr } = await supabase
        .from('patient_documents')
        .insert([{ patient_id: patientId, file_url: storedPath, file_type: fileType }]);
      if (insertErr) console.error('Document insert error:', insertErr);
    }

    alert('Patient saved successfully!');
    navigate('/all-patients');
  }

  return (
    <Box p={4}>
      <Heading as="h4" size="md" color="blue.500" mb={4}>
        New Patient
      </Heading>
      <VStack as="form" onSubmit={handleSubmit} spacing={4} align="stretch" id="new-patient-form">
        <FormControl>
          <FormLabel htmlFor="patient-photo">Photo</FormLabel>
          <Input
            id="patient-photo"
            name="patientPhoto"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
          />
          {previewUrl && (
            <Image src={previewUrl} alt="Preview" boxSize="150px" objectFit="cover" mt={2} />
          )}
        </FormControl>
        <FormControl>
          <FormLabel>First Name</FormLabel>
          <Input name="firstName" placeholder="First Name" />
        </FormControl>
        <FormControl>
          <FormLabel>Last Name</FormLabel>
          <Input name="lastName" placeholder="Last Name" />
        </FormControl>
        <FormControl>
          <FormLabel>Email</FormLabel>
          <Input name="email" type="email" placeholder="Email" />
        </FormControl>
        <FormControl>
          <FormLabel>Mobile</FormLabel>
          <Input name="mobile" placeholder="Mobile No." />
        </FormControl>
        <FormControl>
          <FormLabel>Birthday</FormLabel>
          <Input name="birthday" type="date" placeholder="Birthday" />
        </FormControl>
        <FormControl>
          <FormLabel>Marital Status</FormLabel>
          <Select name="maritalStatus" placeholder="Marital Status">
            <option>Married</option>
            <option>Unmarried</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Sex</FormLabel>
          <Select name="sex" placeholder="Sex">
            <option>Male</option>
            <option>Female</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Blood Group</FormLabel>
          <Select name="bloodGroup" placeholder="Blood Group">
            <option>A+</option>
            <option>A-</option>
            <option>B+</option>
            <option>B-</option>
            <option>O+</option>
            <option>O-</option>
            <option>AB+</option>
            <option>AB-</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Weight</FormLabel>
          <Input name="weight" type="number" step="any" placeholder="Weight" />
        </FormControl>
        <FormControl>
          <FormLabel>Height</FormLabel>
          <Input name="height" type="number" step="any" placeholder="Height" />
        </FormControl>
        <FormControl>
          <FormLabel>Address</FormLabel>
          <Textarea name="address" rows={3} placeholder="Address" />
        </FormControl>
        <FormControl>
          <FormLabel>Patient History</FormLabel>
          <Textarea name="history" rows={3} placeholder="Patient History" />
        </FormControl>
        <FormControl>
          <FormLabel>Upload Documents</FormLabel>
          <Input
            id="patient-documents"
            name="patientDocuments"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.png"
            multiple
          />
        </FormControl>
        <Button type="submit" colorScheme="blue" alignSelf="flex-end">
          Save All
        </Button>
      </VStack>
    </Box>
  );
}