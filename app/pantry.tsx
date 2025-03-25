import * as ImagePicker from 'expo-image-picker';
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
    purchaseDate?: string;
    quantity?: string;
    expirationDate?: string; // Add this field
    storageType?: 'refrigerated' | 'pantry' | 'frozen'; // Add this field
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

  const pickImageFromGallery = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to import food images.');
      return;
    }
    
    try {
      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Navigate to camera screen with the selected image URI
        router.push({
          pathname: '/camera',
          params: { imageUri: result.assets[0].uri }
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image from gallery.');
    }
  };
  
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
// Modify the renderPantryItem function to remove the header section
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
      
      {/* Remove the header section that was here */}
      
      {item.imageUri && (
        <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
      )}
      
      <View style={styles.foodItemsContainer}>
        <Text style={styles.sectionTitle}>Food Items:</Text>
        {item.foodItems.map((foodItem, index) => (
          <View key={index} style={styles.foodItemRow}>
            {/* The rest of the food item display remains the same */}
            <View style={styles.foodItemNameContainer}>
              <Text style={styles.foodItemName}>{foodItem.name}</Text>
              {foodItem.quantity && (
                <Text style={styles.foodItemQuantity}>Quantity: {foodItem.quantity}</Text>
              )}
            </View>
            <View style={styles.foodItemDetailsContainer}>
              {foodItem.purchaseDate && (
                <Text style={styles.foodItemPurchaseDate}>Purchased: {foodItem.purchaseDate}</Text>
              )}
              {foodItem.expirationDate && (
                <Text style={[
                  styles.foodItemExpiration,
                  isExpiringSoon(foodItem.expirationDate) && styles.expiringWarning,
                  isExpired(foodItem.expirationDate) && styles.expiredWarning
                ]}>
                  Expires: {foodItem.expirationDate}
                </Text>
              )}
              {foodItem.storageType && (
                <Text style={styles.foodItemStorageType}>
                  {foodItem.storageType.charAt(0).toUpperCase() + foodItem.storageType.slice(1)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
  return (
    <View style={styles.container}>
    <StatusBar style="auto" />
    
    {/* SINGLE HEADER - replace both existing headers with this */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Pantry</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => router.push('/recipeBook')}
        >
          <Ionicons name="restaurant" size={24} color="white" />
          <Text style={styles.headerButtonText}>Recipes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={pickImageFromGallery}
        >
          <Ionicons name="images" size={24} color="white" />
          <Text style={styles.headerButtonText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => router.push('/camera')}
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.headerButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>
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

function isExpiringSoon(expirationDate: string): boolean {
    if (!expirationDate) return false;
    
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 3; // Warning for items expiring within 3 days
  }
  
  function isExpired(expirationDate: string): boolean {
    if (!expirationDate) return false;
    
    const expDate = new Date(expirationDate);
    const today = new Date();
    return expDate < today;
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
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  headerButtonText: {
    color: 'white',
    marginLeft: 6,
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
    flexDirection: 'column',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  foodItemText: {
    fontSize: 15,
    color: '#444',
  },
  foodItemConfidence: {
    fontSize: 14,
    color: '#888',
  },
  foodItemNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    flex: 1,
  },
  foodItemQuantity: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  foodItemDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foodItemPurchaseDate: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  foodItemExpiration: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  expiringWarning: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  expiredWarning: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  foodItemStorageType: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    overflow: 'hidden',
  },
});