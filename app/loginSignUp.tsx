import React, { useState } from 'react';
import { TextInput, Button, View, Text, StyleSheet } from 'react-native';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { router } from 'expo-router';

const LoginSignup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    try {
      if (isSignUp) {
        // Sign Up Flow
        await createUserWithEmailAndPassword(auth, email, password);
        alert('User signed up successfully!');
        setEmail(''); // Clear the email field after sign up
        setPassword(''); // Clear the password field after sign up
        router.push('/home'); // Navigate to home screen after sign up
      } else {
        // Log In Flow
        await signInWithEmailAndPassword(auth, email, password);
        alert('Logged in successfully!');
        setEmail(''); // Clear the email field after login
        setPassword(''); // Clear the password field after login
        router.push('/home'); // Navigate to home screen after log in
      }
    } catch (err: any) {
      setError(err.message); // Display error message if authentication fails
    }
  };

  // Clear fields when switching between sign-up and log-in
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setEmail(''); // Clear the email field when switching modes
    setPassword(''); // Clear the password field when switching modes
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title={isSignUp ? 'Sign Up' : 'Log In'} onPress={handleAuth} />
      <Text style={styles.toggleText} onPress={toggleAuthMode}>
        {isSignUp
          ? 'Already have an account? Log In'
          : 'Don\'t have an account? Sign Up'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
    borderRadius: 5,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  toggleText: {
    marginTop: 10,
    textAlign: 'center',
    color: 'blue',
  },
});

export default LoginSignup;