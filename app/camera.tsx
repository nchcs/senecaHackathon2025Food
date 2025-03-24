import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Button, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

interface LocalizedObjectAnnotation {
  name: string;
  score: number;
  boundingPoly?: any;
  mid?: string;
}

interface FoodItem {
  name: string;
  confidence: number;
  source: string;
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



  
  async function takePicture() {
    if (cameraRef.current) {
      try {
        console.log("1. Taking picture...");
        const photo = await cameraRef.current.takePictureAsync();
        console.log("2. Picture taken:", photo.uri);
  
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
              name: label.description,
              confidence: label.score,
              source: 'label'
            }));
          foodItems.push(...labels);
        }
        
        
        // Process objects
        if (response.localizedObjectAnnotations) {
          const objects = response.localizedObjectAnnotations
            .filter((obj: LocalizedObjectAnnotation) => isFoodRelated(obj.name))
            .map((obj: LocalizedObjectAnnotation) => ({
              name: obj.name,
              confidence: obj.score,
              source: 'object'
            }));
          foodItems.push(...objects);
        }
        
        // Process web detection
        // Process web detection
      if (response.webDetection) {
  // Web entities
  if (response.webDetection.webEntities) {
    const webEntities = response.webDetection.webEntities
      .filter((entity: WebEntity) => entity.description && isFoodRelated(entity.description))
      .map((entity: WebEntity) => ({
        name: entity.description,
        confidence: entity.score,
        source: 'web'
      }));
    foodItems.push(...webEntities);
  }
  
  // Best guess labels
  if (response.webDetection.bestGuessLabels) {
    const bestGuesses = response.webDetection.bestGuessLabels
      .filter((guess: BestGuessLabel) => isFoodRelated(guess.label))
      .map((guess: BestGuessLabel) => ({
        name: guess.label,
        confidence: 0.9, // These don't come with scores
        source: 'best_guess'
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
          alert(`Detected food: ${foodNames}`);
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
  
  // Helper function to check if a term is food-related
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

  async function savePicture()
  {
    if(photo)
    {
      try
      {
        await MediaLibrary.saveToLibraryAsync(photo);
        alert('YES YES');
        setPhoto(null);
      }catch(error)
      {
        console.error('NO NO', error);
      }
    }
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        <View style={styles.previewButtons}>
          <TouchableOpacity style={styles.button} onPress={() => setPhoto(null)}>
            <Text style={styles.text}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={savePicture}>
            <Text style={styles.text}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
    <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}>Flip Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </CameraView>
  </View>
);
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
    fontSize: 24,
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
});