import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantry App</Text>
      <Text style={styles.subtitle}>Scan and organize your food items</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/camera')}
        >
          <Ionicons name="camera-outline" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Scan Food</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.pantryButton]} 
          onPress={() => router.push('/pantry')}
        >
          <Ionicons name="basket-outline" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>View Pantry</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.instructionText}>
        Take photos of food items to identify and add them to your pantry
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,  // Add margin between buttons
  },
  pantryButton: {
    backgroundColor: '#34C759', // Green color for the pantry button
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  }
});