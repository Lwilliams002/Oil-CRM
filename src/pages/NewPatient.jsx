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

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
      origin_location: formData.get('originLocation'),
      companion_name: formData.get('companionName'),
      surgery_date: formData.get('surgeryDate'),
      clinic: formData.get('clinic'),
      coordinator: formData.get('coordinator'),
      surgeon: formData.get('surgeon'),
      procedures: formData.get('procedures'),
      needs_drains: formData.get('needsDrains'),
      needs_next_day_visit: formData.get('needsNextDayVisit'),
      arrival_miami: formData.get('arrivalMiami'),
      arrival_house: formData.get('arrivalHouse'),
      departure_date: formData.get('departureDate'),
      package_selected: formData.get('packageSelected'),
      faja_size: formData.get('fajaSize'),
      transfer_airport_to_house: formData.get('transferAirportToHouse'),
      transfer_house_to_clinic: formData.get('transferHouseToClinic'),
      allergies: formData.get('allergies'),
      medical_conditions: formData.get('medicalConditions'),
      current_medications: formData.get('currentMedications'),
      emergency_contact: formData.get('emergencyContact'),
      add_lymphatic_massages: formData.get('addLymphaticMassages'),
      requested_accessories: formData.get('requestedAccessories'),
      dietary_restrictions: formData.get('dietaryRestrictions'),
      deposit_paid: formData.get('depositPaid'),
      consents_sent: formData.get('consentsSent'),
      consents_signed: formData.get('consentsSigned'),
      no_delivery_understood: formData.get('noDeliveryUnderstood'),
      massages_not_included_understood: formData.get('massagesNotIncludedUnderstood'),
      profile_url: null,
      created_by: session?.user?.id || null
    };

    // Normalize empty strings to null so Postgres date/number columns don't get ""
    Object.keys(record).forEach((key) => {
      if (record[key] === '') {
        record[key] = null;
      }
    });

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
    async function uploadViaPresign(file, patientId, category = 'document') {
      // 1) Call /sign-upload
      const resp = await fetch(`${API_BASE}/sign-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          patientId,
          category,
        })
      });

      let raw;
      let signResp;
      try {
        raw = await resp.text();               // read body once
        signResp = raw ? JSON.parse(raw) : {}; // try to parse JSON
      } catch (e) {
        console.error('[sign-upload] non-JSON response:', raw);
        throw new Error(`sign-upload returned non-JSON body (status ${resp.status})`);
      }

      if (!resp.ok) {
        console.error('[sign-upload] error payload:', signResp);
        throw new Error(signResp?.error || `sign-upload failed (status ${resp.status})`);
      }

      console.log('[sign-upload] response:', signResp);

      if (!signResp || !(signResp.uploadUrl && (signResp.objectKey || signResp.object_key))) {
        throw new Error('sign-upload did not return expected fields');
      }

      // 2) Upload file to Wasabi with the pre-signed URL
      const put = await fetch(signResp.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!put.ok) {
        const txt = await put.text().catch(() => '');
        console.error('[wasabi PUT] error body:', txt);
        throw new Error(`Upload failed (status ${put.status})`);
      }

      // 3) Finalize on backend (update metadata, size, etc.)
      const finalizeResp = await fetch(`${API_BASE}/finalize-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ docId: signResp.docId, sizeBytes: file.size })
      });

      let finalizeRaw;
      let finalizeJson;
      try {
        finalizeRaw = await finalizeResp.text();
        finalizeJson = finalizeRaw ? JSON.parse(finalizeRaw) : {};
      } catch (e) {
        console.error('[finalize-upload] non-JSON response:', finalizeRaw);
        throw new Error(`finalize-upload returned non-JSON body (status ${finalizeResp.status})`);
      }

      if (!finalizeResp.ok) {
        console.error('[finalize-upload] error payload:', finalizeJson);
        throw new Error(finalizeJson?.error || `finalize-upload failed (status ${finalizeResp.status})`);
      }

      const objectKey = signResp.objectKey || signResp.object_key || signResp.Key;
      if (!objectKey) throw new Error('Missing objectKey in sign-upload response');

      signResp.objectKey = objectKey;
      return signResp; // { uploadUrl, objectKey, docId, ... }
    }

    try {
      // 2) Upload profile photo to Wasabi (optional)
      const photoFile = formData.get('patientPhoto');
      if (photoFile && photoFile.name) {
        const signed = await uploadViaPresign(photoFile, patientId, 'avatar');
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
          await uploadViaPresign(file, patientId, 'document');
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
        Nueva reserva de paciente
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
          <FormLabel>Historial del paciente / Comentarios</FormLabel>
          <Textarea name="history" rows={3} placeholder="Anota cualquier detalle relevante del paciente" />
        </FormControl>

        {/* Datos de procedencia y acompañante */}
        <FormControl>
          <FormLabel>Estado / Ciudad de procedencia</FormLabel>
          <Input name="originLocation" placeholder="Ej. Houston, Texas" />
        </FormControl>

        <FormControl>
          <FormLabel>Acompañante (si aplica)</FormLabel>
          <Input name="companionName" placeholder="Nombre del acompañante" />
        </FormControl>

        {/* Datos de cirugía */}
        <FormControl>
          <FormLabel>Fecha de cirugía</FormLabel>
          <Input name="surgeryDate" type="date" />
        </FormControl>

        <FormControl>
          <FormLabel>Clínica</FormLabel>
          <Input name="clinic" placeholder="Nombre de la clínica" />
        </FormControl>

        <FormControl>
          <FormLabel>Coordinadora</FormLabel>
          <Input name="coordinator" placeholder="Nombre de la coordinadora (si aplica)" />
        </FormControl>

        <FormControl>
          <FormLabel>Doctor (cirujano)</FormLabel>
          <Input name="surgeon" placeholder="Nombre del cirujano" />
        </FormControl>

        <FormControl>
          <FormLabel>Procedimiento(s)</FormLabel>
          <Textarea name="procedures" rows={2} placeholder="Ej. Lipo 360, BBL, abdominoplastia" />
        </FormControl>

        <Stack direction={['column', 'row']} spacing={4}>
          <FormControl>
            <FormLabel>¿Necesitará drenajes?</FormLabel>
            <Select name="needsDrains" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>¿Requiere visita postoperatoria al día siguiente?</FormLabel>
            <Select name="needsNextDayVisit" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
        </Stack>

        {/* Fechas de llegada y salida */}
        <Stack direction={['column', 'row']} spacing={4}>
          <FormControl>
            <FormLabel>Fecha de llegada a Miami</FormLabel>
            <Input name="arrivalMiami" type="date" />
          </FormControl>
          <FormControl>
            <FormLabel>Fecha de llegada a la casa</FormLabel>
            <Input name="arrivalHouse" type="date" />
          </FormControl>
          <FormControl>
            <FormLabel>Fecha de salida</FormLabel>
            <Input name="departureDate" type="date" />
          </FormControl>
        </Stack>

        {/* Paquete y talla de faja */}
        <Stack direction={['column', 'row']} spacing={4}>
          <FormControl>
            <FormLabel>Paquete elegido</FormLabel>
            <Input name="packageSelected" placeholder="Ej. Paquete básico, VIP, etc." />
          </FormControl>
          <FormControl>
            <FormLabel>Talla de faja</FormLabel>
            <Input name="fajaSize" placeholder="Ej. S, M, L o número" />
          </FormControl>
        </Stack>

        {/* Transporte */}
        <Stack direction={['column', 'row']} spacing={4}>
          <FormControl>
            <FormLabel>Transporte aeropuerto → casa</FormLabel>
            <Select name="transferAirportToHouse" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Transporte casa → clínica</FormLabel>
            <Select name="transferHouseToClinic" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
        </Stack>

        {/* Alergias y condiciones médicas */}
        <FormControl>
          <FormLabel>Alergias</FormLabel>
          <Textarea name="allergies" rows={2} placeholder="Alergias a medicamentos, alimentos, etc." />
        </FormControl>

        <FormControl>
          <FormLabel>Condiciones médicas</FormLabel>
          <Textarea name="medicalConditions" rows={2} placeholder="Ej. hipertensión, diabetes, etc." />
        </FormControl>

        <FormControl>
          <FormLabel>Medicamentos actuales</FormLabel>
          <Textarea name="currentMedications" rows={2} placeholder="Lista de medicamentos que toma actualmente" />
        </FormControl>

        {/* Contacto de emergencia */}
        <FormControl>
          <FormLabel>Contacto de emergencia</FormLabel>
          <Textarea
            name="emergencyContact"
            rows={2}
            placeholder="Nombre, relación y teléfono del contacto de emergencia"
          />
        </FormControl>

        {/* Masajes y accesorios */}
        <Stack direction={['column', 'row']} spacing={4}>
          <FormControl>
            <FormLabel>¿Desea agregar masajes linfáticos?</FormLabel>
            <Select name="addLymphaticMassages" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Accesorios solicitados</FormLabel>
            <Input name="requestedAccessories" placeholder="Ej. almohadas, tabla, espumas, etc." />
          </FormControl>
        </Stack>

        <FormControl>
          <FormLabel>Restricciones alimentarias</FormLabel>
          <Textarea name="dietaryRestrictions" rows={2} placeholder="Ej. vegetariana, sin lactosa, alergia al gluten, etc." />
        </FormControl>

        {/* Depósito y consentimientos */}
        <Stack direction={['column', 'row']} spacing={4}>
          <FormControl>
            <FormLabel>Depósito pagado</FormLabel>
            <Input name="depositPaid" placeholder="Sí/No y monto, ej. Sí - $200" />
          </FormControl>
          <FormControl>
            <FormLabel>Consentimientos enviados</FormLabel>
            <Select name="consentsSent" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Consentimientos firmados</FormLabel>
            <Select name="consentsSigned" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
        </Stack>

        {/* Políticas entendidas */}
        <Stack direction={['column', 'row']} spacing={4}>
          <FormControl>
            <FormLabel>Política de NO DELIVERY entendida</FormLabel>
            <Select name="noDeliveryUnderstood" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Masajes NO incluidos entendidos</FormLabel>
            <Select name="massagesNotIncludedUnderstood" placeholder="Selecciona una opción">
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </FormControl>
        </Stack>

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