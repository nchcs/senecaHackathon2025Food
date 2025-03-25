import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Button, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import {router} from 'expo-router';


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
          features: [{
            type: "TEXT_DETECTION", // You can also use "LABEL_DETECTION", "FACE_DETECTION", etc.
            maxResults: 5,
          }],
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
  
        // Optional: Show detected text immediately
        if (analysisResults.responses[0]?.fullTextAnnotation) {
          const detectedText = analysisResults.responses[0].fullTextAnnotation.text;
          console.log("Detected text:", detectedText);
          // You could show this in an alert or set it in state
        }
  
      } catch (error) {
        console.error('Failed to take/analyze photo', error);
        alert('Failed to analyze image. Please try again.');
      }
    }
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