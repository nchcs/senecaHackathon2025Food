import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantry App</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/camera')}
      >
        <Text style={styles.buttonText}>Open Camera</Text>
      </TouchableOpacity>

      {/* Add button to navigate to login/signup screen */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('../loginSignUp')} // Navigate to login/signup page

      >
        <Text style={styles.buttonText}>Login / Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10, // Adding some space between buttons
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
