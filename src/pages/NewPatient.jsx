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

    // get Supabase access token for backend auth
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      alert('Not signed in');
      return;
    }

    // 1) Insert patient record (profile_url initially null)
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
      profile_url: null,
      created_by: session?.user?.id || null
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('patients')
      .insert([record])
      .select();

    if (insertErr) {
      console.error('Patient insert failed:', insertErr);
      alert('Could not save patient: ' + insertErr.message);
      return;
    }

    const patientId = inserted?.[0]?.id;
    if (!patientId) {
      alert('Patient created but no ID returned.');
      return;
    }

    // helper to sign + upload + finalize one file
    async function uploadViaPresign(file, patientId) {
      const signResp = await fetch('/api/sign-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          patientId
        })
      }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));
      console.log('[sign-upload] response:', signResp);
      if (!signResp || !(signResp.uploadUrl && (signResp.objectKey || signResp.object_key))) {
        throw new Error('sign-upload did not return expected fields');
      }

      const put = await fetch(signResp.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!put.ok) throw new Error('Upload failed');

      await fetch('/api/finalize-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ docId: signResp.docId, sizeBytes: file.size })
      }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));

      const objectKey = signResp.objectKey || signResp.object_key || signResp.Key;
      if (!objectKey) throw new Error('Missing objectKey in sign-upload response');
      // normalize for callers
      signResp.objectKey = objectKey;

      return signResp; // contains { uploadUrl, objectKey, docId }
    }

    try {
      // 2) Upload profile photo to Wasabi (optional)
      const photoFile = formData.get('patientPhoto');
      if (photoFile && photoFile.name) {
        const signed = await uploadViaPresign(photoFile, patientId);
        const objectKey = signed.objectKey || signed.object_key || signed.Key;
        if (!objectKey) {
          console.error('[photo] No objectKey returned, not updating profile_url:', signed);
        } else {
          // store the object key on the patient row for avatar retrieval
          const { error: upErr } = await supabase
            .from('patients')
            .update({ profile_url: objectKey })
            .eq('id', patientId);
          if (upErr) {
            console.error('[photo] failed to save profile_url:', upErr);
            throw upErr;
          }
          console.log('[photo] profile_url saved:', objectKey);
        }
        console.log('[photo] done');
      }

      // 3) Upload documents (zero or more)
      const docFiles = formData.getAll('patientDocuments');
      for (const file of docFiles) {
        if (!file || !file.name) continue;
        try {
          await uploadViaPresign(file, patientId);
          // No extra insert needed; your backend already created a row in patient_documents on sign
        } catch (docErr) {
          console.error('Document upload error:', docErr);
        }
      }

      alert('Patient saved successfully!');
      navigate('/all-patients');
    } catch (err) {
      console.error('Error during upload:', err);
      alert(`Error saving files: ${err?.message || String(err)}. Check DevTools console for [photo] logs.`);
    }
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