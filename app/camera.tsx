import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState, useEffect } from 'react';
import { 
  Button, 
  Image, 
  Linking, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  TextInput, 
  Modal,
  ActivityIndicator 
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import {router, useLocalSearchParams} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';



// Add these interfaces at the top of your file or in a separate types file
interface LabelAnnotation {
  description: string;
  score: number;
  topicality?: number;
  mid?: string;
}
interface PantryItem {
  id: string;
  timestamp: string;
  imageUri?: string;
  foodItems: FoodItem[];
}
interface LocalizedObjectAnnotation {
  name: string;
  score: number;
  boundingPoly?: any;
  mid?: string;
}

interface FoodItem {
  id?: string;
  name: string;
  confidence: number;
  source: string;
  date?: string;
  purchaseDate?: string;
  quantity?: string;
  expirationDate?: string; // Add this field
  storageType?: 'refrigerated' | 'pantry' | 'frozen'; // Add this field
}

// Add these interface definitions to your existing type definitions
interface WebEntity {
  entityId?: string;
  score: number;
  description: string;
}

interface BestGuessLabel {
  label: string;
  languageCode?: string;
}

interface WebDetection {
  webEntities?: WebEntity[];
  bestGuessLabels?: BestGuessLabel[];
  fullMatchingImages?: any[];
  partialMatchingImages?: any[];
  pagesWithMatchingImages?: any[];
  visuallySimilarImages?: any[];
}

// Create a type-safe function for filtering food items
function isFoodRelated(description: string): boolean {
  // List of common food-related terms
  const foodKeywords = [
    'food', 'fruit', 'vegetable', 'meat', 'dish', 'meal', 'snack', 'dessert',
    'breakfast', 'lunch', 'dinner', 'apple', 'banana', 'orange', 'chicken', 
    'beef', 'pork', 'fish', 'bread', 'rice', 'pasta', 'cheese', 'egg', 
    'milk', 'juice', 'coffee', 'tea', 'water', 'soup', 'salad', 'sandwich',
    'pizza', 'burger', 'fries', 'cookie', 'cake', 'ice cream', 'chocolate',
    'candy', 'nut', 'bean', 'grain', 'cereal', 'yogurt', 'butter', 'oil'
  ];
  
  // Check if description contains any food keyword
  return foodKeywords.some(keyword => 
    description.toLowerCase().includes(keyword.toLowerCase()) ||
    keyword.toLowerCase().includes(description.toLowerCase())
  );
}

const apiKey = 'AIzaSyCI549FIunkY2LgkvNJgdAJMvpmJUtpIj0';  // Replace with your API key
const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
export default function CameraScreen() {
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState('Today');
  const [quantity, setQuantity] = useState('1');
  const [storageType, setStorageType] = useState<'refrigerated' | 'pantry' | 'frozen'>('refrigerated');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [isCalculatingExpiration, setIsCalculatingExpiration] = useState(false);
  const params = useLocalSearchParams();
  const initialImageUri = params.imageUri as string;
  const [analysisLoading, setAnalysisLoading] = useState(false);


  useEffect(() => {
    if (initialImageUri) {
      setPhoto(initialImageUri);
      // Show loading state
      setAnalysisLoading(true);
      
      // Analyze the image if it comes from the gallery
      analyzeImage(initialImageUri)
        .then(results => {
          setAnalysisResults(results);
          setAnalysisLoading(false);
        })
        .catch(error => {
          console.error('Failed to analyze gallery image', error);
          alert('Failed to analyze image. Please try again.');
          setAnalysisLoading(false);
        });
    }
  }, [initialImageUri]);

  React.useEffect(() => {
    (async () => {
      const cameraPermission = await requestPermission();
      const mediaLibraryPermission = await requestMediaPermission();
      console.log('Camera permission requested:', cameraPermission);
      console.log('Media permission requested:', mediaLibraryPermission);
    })();
  }, []);
  
  const openSettings = () => 
  {
    Linking.openSettings();
  };

  if (!permission || !mediaPermission) {
    // Camera permissions are still loading.
    return <View style={styles.container}><Text>Loading permissions...</Text></View>;
  }

  if (!permission.granted) {
    // Camera permissions not granted
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        {permission.canAskAgain ? (
          <Button onPress={requestPermission} title="Grant Camera Permission" />
        ) : (
          <>
            <Text style={styles.message}>
              You need to enable camera permissions in your device settings.
            </Text>
            <Button onPress={openSettings} title="Open Settings" />
          </>
        )}
      </View>
    );
  }

  if (!mediaPermission.granted) {
    // Media permissions not granted
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to save photos</Text>
        {mediaPermission.canAskAgain ? (
          <Button onPress={requestMediaPermission} title="Grant Storage Permission" />
        ) : (
          <>
            <Text style={styles.message}>
              You need to enable media library permissions in your device settings.
            </Text>
            <Button onPress={openSettings} title="Open Settings" />
          </>
        )}
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }


  async function analyzeImage(imageUri: string) {
    try {
      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const requestBody = {
        requests: [{
          image: {
            content: base64Image,
          },
          features: [
            {
              type: "LABEL_DETECTION",
              maxResults: 10,
            },
            {
              type: "OBJECT_LOCALIZATION",
              maxResults: 10,
            },
            {
              type: "WEB_DETECTION",
              maxResults: 10,
            }
          ],
        }],
      };
  
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  }

async function takePicture() {
  if (cameraRef.current) {
    try {
      const photo = await cameraRef.current.takePictureAsync();
      // 3. Analyze the image before showing preview
      console.log("3. Analyzing image...");
      const analysisResults = await analyzeImage(photo.uri);
      console.log("4. Analysis complete:", analysisResults);
      
      // 4. Store both the photo and analysis results
      setAnalysisResults(analysisResults);
      setPhoto(photo.uri);

      // Process the results to identify food
      const response = analysisResults.responses[0];
      const foodItems: FoodItem[] = [];
      
      // Process labels
      if (response.labelAnnotations) {
        const labels = response.labelAnnotations
          .filter((label: LabelAnnotation) => isFoodRelated(label.description))
          .map((label: LabelAnnotation) => ({
            id: Math.random().toString(36).substring(2, 9),
            name: label.description,
            confidence: label.score,
            source: 'label',
            date: new Date().toISOString()
          }));
        foodItems.push(...labels);
      }
      
      // Process objects
      if (response.localizedObjectAnnotations) {
        const objects = response.localizedObjectAnnotations
          .filter((obj: LocalizedObjectAnnotation) => isFoodRelated(obj.name))
          .map((obj: LocalizedObjectAnnotation) => ({
            id: Math.random().toString(36).substring(2, 9),
            name: obj.name,
            confidence: obj.score,
            source: 'object',
            date: new Date().toISOString()
          }));
        foodItems.push(...objects);
      }
      
      // Process web detection
      if (response.webDetection) {
        // Web entities
        if (response.webDetection.webEntities) {
          const webEntities = response.webDetection.webEntities
            .filter((entity: WebEntity) => entity.description && isFoodRelated(entity.description))
            .map((entity: WebEntity) => ({
              id: Math.random().toString(36).substring(2, 9),
              name: entity.description,
              confidence: entity.score,
              source: 'web',
              date: new Date().toISOString()
            }));
          foodItems.push(...webEntities);
        }
        
        // Best guess labels
        if (response.webDetection.bestGuessLabels) {
          const bestGuesses = response.webDetection.bestGuessLabels
            .filter((guess: BestGuessLabel) => isFoodRelated(guess.label))
            .map((guess: BestGuessLabel) => ({
              id: Math.random().toString(36).substring(2, 9),
              name: guess.label,
              confidence: 0.9, // These don't come with scores
              source: 'best_guess',
              date: new Date().toISOString()
            }));
          foodItems.push(...bestGuesses);
        }
      }
      
      // Remove duplicates and sort by confidence
      const uniqueFoodItems = removeDuplicates(foodItems);
      const sortedFoodItems = uniqueFoodItems.sort((a, b) => b.confidence - a.confidence);
      
      if (sortedFoodItems.length > 0) {
        const foodNames = sortedFoodItems.map(item => item.name).join(', ');
        console.log("Detected food items:", foodNames);
        
        // REMOVE THIS LINE to prevent automatic saving
        // await saveFoodItemsToPantry(sortedFoodItems, photo.uri);
        
        // Just inform the user about detection, but don't save yet
        alert(`Detected food: ${foodNames}\n\nPlease select an item to save to your pantry.`);
      } else {
        console.log("No food items detected");
        alert("No food items detected. Please try again with a clearer photo of food.");
      }

    } catch (error) {
      console.error('Failed to take/analyze photo', error);
      alert('Failed to analyze image. Please try again.');
    }
  }
}


// Add this new function to save food items to pantry
async function saveFoodItemsToPantry(foodItems: FoodItem[], imageUri: string) {
  try {
    // Create a new pantry entry
    const newPantryItem: PantryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      imageUri: imageUri,
      foodItems: foodItems,
    };
    
    // Get existing pantry items from AsyncStorage
    let existingItems: PantryItem[] = [];
    const storedItems = await AsyncStorage.getItem('pantryItems');
    
    if (storedItems) {
      existingItems = JSON.parse(storedItems);
    }
    
    // Add the new pantry item to the beginning of the array
    const updatedItems = [newPantryItem, ...existingItems];
    
    // Save the updated array back to AsyncStorage
    await AsyncStorage.setItem('pantryItems', JSON.stringify(updatedItems));
    
    console.log('Food items saved to pantry successfully!');
  } catch (error) {
    console.error('Error saving to pantry:', error);
    throw error;
  }
}

  // Helper function to check if a term is food-related
function isFoodRelated(term: string): boolean {
  const termLower = term.toLowerCase();
  
  // Common food categories
  const foodCategories = [
    'food', 'fruit', 'vegetable', 'meat', 'dish', 'cuisine', 
    'ingredient', 'snack', 'dessert', 'beverage', 'drink', 
    'meal', 'produce', 'bread', 'dairy', 'seafood', 'candy',
    'breakfast', 'lunch', 'dinner', 'appetizer', 'side dish'
  ];
  
  // Common specific foods
  const specificFoods = [
    'apple', 'banana', 'orange', 'strawberry', 'grape', 'lemon',
    'chicken', 'beef', 'pork', 'fish', 'shrimp', 'salmon',
    'rice', 'pasta', 'noodle', 'potato', 'tomato', 'carrot',
    'broccoli', 'lettuce', 'spinach', 'corn', 'cheese', 'milk',
    'yogurt', 'egg', 'bread', 'pizza', 'burger', 'sandwich',
    'cake', 'cookie', 'ice cream', 'chocolate', 'coffee', 'tea',
    'juice', 'soda', 'water', 'soup', 'salad', 'sauce'
  ];
  
  // Check if the term matches any food category or specific food
  return foodCategories.some(category => termLower.includes(category) || 
                                         category.includes(termLower)) ||
         specificFoods.some(food => termLower.includes(food) || 
                                    food.includes(termLower));
}
  
 // Helper function to remove duplicates based on name
function removeDuplicates(items: FoodItem[]): FoodItem[] {
  const uniqueItems: FoodItem[] = [];
  const names = new Set<string>();
  
  for (const item of items) {
    if (!names.has(item.name.toLowerCase())) {
      names.add(item.name.toLowerCase());
      uniqueItems.push(item);
    }
  }
  
  return uniqueItems;
}
function extractFoodItems(response: any): FoodItem[] {
  const foodItems: FoodItem[] = [];
  
  // Process labels
  if (response.labelAnnotations) {
    const labels = response.labelAnnotations
      .filter((label: LabelAnnotation) => isFoodRelated(label.description))
      .map((label: LabelAnnotation) => ({
        name: label.description,
        confidence: label.score, // We'll keep this for sorting but won't display it
        source: 'label'
      }));
    foodItems.push(...labels);
  }
  
  // Rest of the function remains the same
  // ...existing code...
  
  // Remove duplicates and sort by confidence
  const uniqueFoodItems = removeDuplicates(foodItems);
  return uniqueFoodItems.sort((a, b) => b.confidence - a.confidence);
}

async function savePicture() {
  if (photo && selectedFoodItem) {
    // Instead of using prompt, show the modal
    setShowPurchaseModal(true);
  } else if (!selectedFoodItem) {
    Alert.alert('Selection Required', 'Please select a food item before saving.');
  }
}
  // Add this new function to handle the actual saving after modal input
  async function confirmAndSave() {
    if (!photo || !selectedFoodItem) return;
    
    try {
      await MediaLibrary.saveToLibraryAsync(photo);
      
      // Save food item to pantry with the new fields
      await saveFoodItemsToPantry([{
        id: Math.random().toString(36).substring(2, 9),
        name: selectedFoodItem.name,
        confidence: selectedFoodItem.confidence,
        source: selectedFoodItem.source,
        date: new Date().toISOString(),
        purchaseDate: purchaseDate,
        quantity: quantity,
        expirationDate: expirationDate,
        storageType: storageType
      }], photo);

      Alert.alert('Success', `Saved ${selectedFoodItem.name} to your pantry!`);
      
      // Hide the modal
      setShowPurchaseModal(false);
      
      // After saving, navigate to the pantry screen
      router.replace('/pantry');
      
      // Clear the states
      setPhoto(null);
      setSelectedFoodItem(null);
      setAnalysisResults(null);
      setExpirationDate('');
    } catch (error) {
      console.error('Failed to save photo', error);
      Alert.alert('Error', 'Failed to save photo to gallery.');
    }
  }
  if (photo) {
    // Get food items from analysis results if available
    const foodItems = analysisResults?.responses?.[0] ? 
      extractFoodItems(analysisResults.responses[0]) : [];
    
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        
        {analysisLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Analyzing image...</Text>
        </View>
      ) : foodItems.length > 0 ? (
        <View style={styles.foodItemsContainer}>
          <Text style={styles.sectionTitle}>Detected items:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
            {foodItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.foodItemButton,
                  selectedFoodItem?.name === item.name && styles.selectedFoodItem
                ]}
                onPress={() => setSelectedFoodItem(item)}
              >
                <Text style={styles.foodItemText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedFoodItem && (
            <Text style={styles.selectedText}>
              Selected: {selectedFoodItem.name}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.noItemsText}>No food items detected</Text>
      )}
      
      <View style={styles.previewButtons}>
        <TouchableOpacity style={styles.button} onPress={() => setPhoto(null)}>
          <Text style={styles.text}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, !selectedFoodItem && styles.disabledButton]} 
          onPress={savePicture}
          disabled={!selectedFoodItem}
        >
          <Text style={styles.text}>Save</Text>
        </TouchableOpacity>
      </View>
        
      {/* Purchase Information Modal */}
      <Modal
          visible={showPurchaseModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPurchaseModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Food Details</Text>
              
              <Text style={styles.inputLabel}>When did you purchase this item?</Text>
              <TextInput
                style={styles.textInput}
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                placeholder="Today, Yesterday, March 20, etc."
              />
              
              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput
                style={styles.textInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="1 box, 2 pounds, 3 cans, etc."
              />
              
              <Text style={styles.inputLabel}>Storage Method</Text>
              <View style={styles.storageSelector}>
                <TouchableOpacity 
                  style={[
                    styles.storageOption, 
                    storageType === 'refrigerated' && styles.selectedStorageOption
                  ]}
                  onPress={() => setStorageType('refrigerated')}
                >
                  <Ionicons 
                    name="snow-outline" 
                    size={24} 
                    color={storageType === 'refrigerated' ? 'white' : '#666'} 
                  />
                  <Text style={[
                    styles.storageOptionText, 
                    storageType === 'refrigerated' && styles.selectedStorageOptionText
                  ]}>
                    Refrigerated
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.storageOption, 
                    storageType === 'pantry' && styles.selectedStorageOption
                  ]}
                  onPress={() => setStorageType('pantry')}
                >
                  <Ionicons 
                    name="cube-outline" 
                    size={24} 
                    color={storageType === 'pantry' ? 'white' : '#666'} 
                  />
                  <Text style={[
                    styles.storageOptionText, 
                    storageType === 'pantry' && styles.selectedStorageOptionText
                  ]}>
                    Pantry
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.storageOption, 
                    storageType === 'frozen' && styles.selectedStorageOption
                  ]}
                  onPress={() => setStorageType('frozen')}
                >
                  <Ionicons 
                    name="snow" 
                    size={24} 
                    color={storageType === 'frozen' ? 'white' : '#666'} 
                  />
                  <Text style={[
                    styles.storageOptionText, 
                    storageType === 'frozen' && styles.selectedStorageOptionText
                  ]}>
                    Frozen
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.predictButton}
                onPress={async () => {
                  if (selectedFoodItem) {
                    const predicted = await predictExpirationWithMistral(
                      selectedFoodItem.name,
                      purchaseDate,
                      storageType
                    );
                    setExpirationDate(predicted);
                  }
                }}
                disabled={isCalculatingExpiration || !selectedFoodItem}
              >
                <Text style={styles.predictButtonText}>
                  {isCalculatingExpiration ? 'Calculating...' : 'Calculate Expiration Date'}
                </Text>
              </TouchableOpacity>
              
              {expirationDate ? (
                <View style={styles.expirationContainer}>
                  <Text style={styles.expirationLabel}>Estimated Expiration:</Text>
                  <Text style={styles.expirationDate}>{expirationDate}</Text>
                </View>
              ) : null}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={() => setShowPurchaseModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]} 
                  onPress={confirmAndSave}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
else{
  // Add the camera view rendering when no photo is taken
   return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          onMountError={(error) => console.error("Camera mount error:", error)}
        >
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity style={styles.sideButton} onPress={() => router.back()}>
              <Text style={styles.text}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sideButton} onPress={toggleCameraFacing}>
              <Text style={styles.text}>Flip</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
}

 // Add Mistral AI function for expiration prediction
 async function predictExpirationWithMistral(
  foodName: string,
  purchaseDate: string,
  storageType: string
): Promise<string> {
  setIsCalculatingExpiration(true);
  
  try {
    const API_KEY = "S2G8k3FjitWDQSC2LBEXZwjNvm6mZcgP"; 
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-small", // You can also use mistral-medium or mistral-large for potentially better results
        messages: [
          {
            role: "system",
            content: "You are a food safety expert. Your task is to provide expiration dates for food items based on their purchase date and storage method. Respond with ONLY a date in MM/DD/YYYY format."
          },
          {
            role: "user",
            content: `Food item: ${foodName}
            Purchase date: ${purchaseDate}
            Storage method: ${storageType}
            
            When will this food expire? Please respond with ONLY the expiration date in MM/DD/YYYY format. If the purchase date is imprecise (like "Today"), assume today's date (${new Date().toLocaleDateString()}).`
          }
        ],
        temperature: 0.2,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Extract date from response
    const content = data.choices[0].message.content.trim();
    const datePattern = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/;
    const match = content.match(datePattern);
    
    if (match) {
      return match[0]; // Return the matched date
    } else {
      // If no date format found, use the response directly if it resembles a date
      // Otherwise, use fallback calculation
      const fallbackDate = new Date();
      
      // Determine fallback expiration based on storage type
      let daysToAdd = 7; // Default for refrigerated
      if (storageType === 'frozen') {
        daysToAdd = 90;
      } else if (storageType === 'pantry') {
        daysToAdd = 14;
      }
      
      fallbackDate.setDate(fallbackDate.getDate() + daysToAdd);
      return fallbackDate.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error predicting expiration date:', error);
    
    // Fallback date calculation
    const fallbackDate = new Date();
    
    let daysToAdd = 7; // Default for refrigerated
    if (storageType === 'frozen') {
      daysToAdd = 90;
    } else if (storageType === 'pantry') {
      daysToAdd = 14;
    }
    
    fallbackDate.setDate(fallbackDate.getDate() + daysToAdd);
    return fallbackDate.toLocaleDateString();
  } finally {
    setIsCalculatingExpiration(false);
  }
}

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  preview: {
    flex: 1,
    width: '100%',
    height: '80%',
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 25,
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    margin: 5,
  },

  foodItemsContainer: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  itemsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  foodItemButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedFoodItem: {
    backgroundColor: '#4CAF50',
  },
  foodItemText: {
    color: 'white',
    fontSize: 16,
  },
  selectedText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  noItemsText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 20,
  },
  sideButton: {
    alignItems: 'center',
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    color: '#444',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#ccc',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  storageSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  storageOption: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
  },
  selectedStorageOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  storageOptionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  selectedStorageOptionText: {
    color: 'white',
  },
  // Add these styles for the predict button
  predictButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  predictButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Add these styles for displaying the expiration date
  expirationContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    alignItems: 'center',
  },
  expirationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  expirationDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  }
});