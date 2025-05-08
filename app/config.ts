import Constants from 'expo-constants';

interface EnvVariables {
  googleVisionApiKey: string;
  mistralApiKey: string;
}

// Get environment variables from Expo Constants
const ENV = Constants.expoConfig?.extra as EnvVariables || {
  googleVisionApiKey: '',
  mistralApiKey: ''
};

export default {
  googleVisionApiKey: ENV.googleVisionApiKey,
  mistralApiKey: ENV.mistralApiKey
};