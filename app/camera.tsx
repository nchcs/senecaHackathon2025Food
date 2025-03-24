import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Button, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import {router} from 'expo-router';

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

// ...existing code...
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


// Update the savePicture function
async function savePicture() {
  if (photo && selectedFoodItem) {
    try {
      await MediaLibrary.saveToLibraryAsync(photo);
      
      // Save just the selected food item to pantry
      await saveFoodItemsToPantry([{
        id: Math.random().toString(36).substring(2, 9),
        name: selectedFoodItem.name,
        confidence: selectedFoodItem.confidence,
        source: selectedFoodItem.source,
        date: new Date().toISOString()
      }], photo);

      alert(`Saved ${selectedFoodItem.name} to your pantry!`);
      
      // After saving, navigate to the pantry screen
      router.replace('/pantry');
      
      // Clear the states
      setPhoto(null);
      setSelectedFoodItem(null);
      setAnalysisResults(null);
    } catch (error) {
      console.error('Failed to save photo', error);
      alert('Failed to save photo to gallery.');
    }
  } else if (!selectedFoodItem) {
    alert('Please select a food item before saving.');
  }
}

if (photo) {
  // Get food items from analysis results if available
  const foodItems = analysisResults?.responses?.[0] ? 
    extractFoodItems(analysisResults.responses[0]) : [];
  
  return (
    <View style={styles.container}>
      <Image source={{ uri: photo }} style={styles.preview} />
      
      {foodItems.length > 0 ? (
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
});