import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Collapse,
  Flex,
  Text,
  useDisclosure,
  Tooltip
} from '@chakra-ui/react';
import {
  FaThLarge,
  FaUsers,
  FaCalendarPlus,
  FaTag,
  FaChevronDown,
  FaChevronRight,
  FaUserPlus,
  FaUserFriends
} from 'react-icons/fa';

export default function Sidebar({ isOpen = true, userEmail = '' }) {
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
          {/* Toggle Patients menu */}
          <Tooltip label="Patients" placement="right" isDisabled={isOpen}>
            <Flex
              onClick={togglePatients}
              align="center"
              cursor="pointer"
              userSelect="none"
            >
              <FaUsers />
              {isOpen && <Text ml="2" flex="1">Patients</Text>}
              {isOpen && (isPatientsOpen ? <FaChevronDown /> : <FaChevronRight />)}
            </Flex>
          </Tooltip>
          <Collapse in={isPatientsOpen} animateOpacity style={{ marginTop: isOpen ? '0.5rem' : '0' }}>
            <VStack align="start" pl={isOpen ? '6' : '0'} mt="2" spacing="2">
              <NavLink to="/patients/new">
                <HStack spacing="3">
                  <FaUserPlus />
                  {isOpen ? <Text>New Patient</Text> : <Tooltip label="New Patient"><Box /></Tooltip>}
                </HStack>
              </NavLink>
              <NavLink to="/patients">
                <HStack spacing="3">
                  <FaUserFriends />
                  {isOpen ? <Text>All Patients</Text> : <Tooltip label="All Patients"><Box /></Tooltip>}
                </HStack>
              </NavLink>
            </VStack>
          </Collapse>
        </Box>

        <NavLink to="/appointments/new">
          <HStack spacing="3">
            <FaCalendarPlus />
            {isOpen && <Text>Appointment</Text>}
          </HStack>
        </NavLink>

        <NavLink to="/inventory">
          <HStack spacing="3">
            <FaTag />  {/* or a suitable inventory icon */}
            {isOpen && <Text>Inventory</Text>}
          </HStack>
        </NavLink>

      </VStack>
    </Box>
  );
}