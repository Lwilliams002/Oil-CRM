import React, {useState} from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Flex, Box } from '@chakra-ui/react';

export default function Layout({ userEmail, handleLogout, children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const toggleSidebar = () => setIsSidebarOpen(open => !open);

  return (
    <Flex height={["100dvh", null, "100vh"]} overflow="hidden">
      {/* Sidebar */}
        <Box w={isSidebarOpen ? '200px' : '60px'} bg="gray.100" borderRightWidth="1px" transition="width .2s">
          <Sidebar isOpen={isSidebarOpen} />
        </Box>
      {/* Main area */}
      <Flex direction="column" flex="1">
        <Header
          userEmail={userEmail}
          handleLogout={handleLogout}
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <Box flex="1" overflowY="auto" p={4}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}