import React, {useState} from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Flex, Box } from '@chakra-ui/react';

export default function Layout({ userEmail, handleLogout, children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const toggleSidebar = () => setIsSidebarOpen(open => !open);

  return (
    <Flex height="100vh">
      {/* Sidebar */}
        <Box w={isSidebarOpen ? '200px' : '60px'} bg="gray.100" borderRightWidth="1px" transition="width .2s">
        <Sidebar isOpen={isSidebarOpen} />
    </Box>
      {/* Main area */}
      <Flex direction="column" flex="1">
        <Header userEmail={userEmail} handleLogout={handleLogout} toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <Box p={4} flex="1" overflowY="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}