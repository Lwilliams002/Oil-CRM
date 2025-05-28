import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, IconButton, Button, Text, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { FaExpand, FaBars } from 'react-icons/fa';

export default function Header({ toggleSidebar }) {
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();
      if (user && user.email) {
        setUserEmail(user.email);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true }); // adjust route if needed
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <Box as="header" bg="white" boxShadow="md" px={4} py={2}>
      <Flex align="center" justify="space-between" maxW="1500px" mx="auto">
        <IconButton
          aria-label="Toggle sidebar"
          icon={<FaBars />}
          variant="ghost"
          onClick={toggleSidebar}
        />
        <Flex align="center">
          <IconButton
            aria-label="Toggle full screen"
            icon={<FaExpand />}
            variant="ghost"
            onClick={toggleFullScreen}
            mr={4}
          />
          <Menu>
            <MenuButton as={Button} variant="link" rightIcon={<ChevronDownIcon />}>
              <Text fontWeight="medium">{userEmail || 'User'}</Text>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
    </Box>
  );
}