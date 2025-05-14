import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
  Alert,
  AlertIcon,
  Link,
  Text,
} from '@chakra-ui/react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: supaErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (supaErr) {
      setError(supaErr.message);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <Box maxW="md" mx="auto" mt="20" p="8" borderWidth="1px" borderRadius="lg" boxShadow="lg">
      <VStack spacing="6" as="form" onSubmit={handleSubmit}>
        <Heading size="lg">Sign in to account</Heading>
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
        <FormControl id="email" isRequired>
          <FormLabel>Email address</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </FormControl>
        <FormControl id="password" isRequired>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </FormControl>
        <Button
          type="submit"
          colorScheme="blue"
          width="full"
          isLoading={loading}
        >
          Sign in
        </Button>
        <Text fontSize="sm">
          Don't have an account?{' '}
          <Link color="blue.500" onClick={() => navigate('/signup')}>
            Sign up
          </Link>
        </Text>
      </VStack>
    </Box>
  );
}