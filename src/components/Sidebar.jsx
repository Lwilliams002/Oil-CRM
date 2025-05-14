import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Collapse,
  Flex,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import {
  FaThLarge,
  FaUsers,
  FaCalendarPlus,
  FaTag
} from 'react-icons/fa';

export default function Sidebar({ isOpen = true }) {
  const {
    isOpen: isPatientsOpen,
    onToggle: togglePatients
  } = useDisclosure();
  const {
    isOpen: isAuthOpen,
    onToggle: toggleAuth
  } = useDisclosure();

  return (
    <Box
      as="aside"
      w={isOpen ? '200px' : '60px'}
      bg="gray.800"
      color="white"
      h="100vh"
      p="4"
      overflowY="auto"
      transition="width .2s"
    >
      <VStack align="start" spacing="4">
        <NavLink to="/dashboard">
          <HStack spacing="3">
            <FaThLarge />
            {isOpen && <Text>Dashboard</Text>}
          </HStack>
        </NavLink>

        <Box w="full">
          <Flex
            onClick={togglePatients}
            align="center"
            cursor="pointer"
            userSelect="none"
          >
            <FaUsers />
            {isOpen && <Text ml="2">Patients</Text>}
          </Flex>
          {isOpen && (
            <Collapse in={isPatientsOpen} animateOpacity>
              <VStack align="start" pl="6" mt="2" spacing="2">
                <NavLink to="/patients/new">
                  <Text>New Patient</Text>
                </NavLink>
                <NavLink to="/patients">
                  <Text>All Patients</Text>
                </NavLink>
              </VStack>
            </Collapse>
          )}
        </Box>

        <NavLink to="/appointments/new">
          <HStack spacing="3">
            <FaCalendarPlus />
            {isOpen && <Text>Appointment</Text>}
          </HStack>
        </NavLink>

        <Box w="full">
          <Flex
            onClick={toggleAuth}
            align="center"
            cursor="pointer"
            userSelect="none"
          >
            <FaTag />
            {isOpen && <Text ml="2">Authentication</Text>}
          </Flex>
          {isOpen && (
            <Collapse in={isAuthOpen} animateOpacity>
              <VStack align="start" pl="6" mt="2" spacing="2">
                <NavLink to="/patient-details">
                  <Text>Patient Details</Text>
                </NavLink>
                <NavLink to="/page-login">
                  <Text>Login</Text>
                </NavLink>
              </VStack>
            </Collapse>
          )}
        </Box>
      </VStack>
    </Box>
  );
}