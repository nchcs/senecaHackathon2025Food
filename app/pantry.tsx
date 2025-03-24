import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Define the interfaces for our data
interface FoodItem {
  id: string;
  name: string;
  confidence: number;
  source: string;
  date: string;
  imageUri?: string;
}

interface PantryItem {
  id: string;
  timestamp: string;
  imageUri?: string;
  foodItems: FoodItem[];
}

export default function PantryScreen() {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved pantry items on component mount
  useEffect(() => {
    loadPantryItems();
  }, []);

  // Function to load pantry items from AsyncStorage
  const loadPantryItems = async () => {
    try {
      const storedItems = await AsyncStorage.getItem('pantryItems');
      if (storedItems) {
        setPantryItems(JSON.parse(storedItems));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading pantry items:', error);
      Alert.alert('Error', 'Failed to load pantry items.');
      setLoading(false);
    }
  };

  // Function to delete a pantry item
  const deletePantryItem = async (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item from your pantry?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedItems = pantryItems.filter(item => item.id !== id);
              setPantryItems(updatedItems);
              await AsyncStorage.setItem('pantryItems', JSON.stringify(updatedItems));
            } catch (error) {
              console.error('Error deleting pantry item:', error);
              Alert.alert('Error', 'Failed to delete pantry item.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Function to render each pantry item
 // Function to render each pantry item
const renderPantryItem = ({ item }: { item: PantryItem }) => {
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <View style={styles.pantryItemContainer}>
        <View style={styles.pantryItemHeader}>
          <Text style={styles.pantryItemDate}>{formattedDate} at {formattedTime}</Text>
          <TouchableOpacity onPress={() => deletePantryItem(item.id)}>
            <Ionicons name="trash-outline" size={24} color="red" />
          </TouchableOpacity>
        </View>
        
        {item.imageUri && (
          <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
        )}
        
        <View style={styles.foodItemsContainer}>
          <Text style={styles.sectionTitle}>Food Items:</Text>
          {item.foodItems.map((foodItem, index) => (
            <View key={index} style={styles.foodItemRow}>
              <Text style={styles.foodItemName}>{foodItem.name}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Pantry</Text>
        <TouchableOpacity style={styles.cameraButton} onPress={() => router.push('/camera')}>
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.cameraButtonText}>Scan Food</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading pantry items...</Text>
        </View>
      ) : pantryItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your pantry is empty</Text>
          <Text style={styles.emptySubText}>
            Take photos of food items to add them to your pantry
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton} 
            onPress={() => router.push('/camera')}
          >
            <Text style={styles.emptyButtonText}>Take Food Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pantryItems}
          renderItem={renderPantryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraButtonText: {
    color: 'white',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#666',
  },
  emptySubText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    color: '#999',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  pantryItemContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pantryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pantryItemDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  thumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  foodItemsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  foodItemName: {
    fontSize: 15,
    color: '#444',
  },
  foodItemConfidence: {
    fontSize: 14,
    color: '#888',
  },
});