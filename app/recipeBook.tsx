import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

// Define the interfaces (matching your existing pantry.tsx structure)
interface FoodItem {
  id: string;
  name: string;
  confidence: number;
  source: string;
  date: string;
  purchaseDate?: string;
  quantity?: string;
  expirationDate?: string;
  storageType?: 'refrigerated' | 'pantry' | 'frozen';
  imageUri?: string;
}

interface PantryItem {
  id: string;
  timestamp: string;
  imageUri?: string;
  foodItems: FoodItem[];
}

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  cookingTime?: string;
  difficulty?: string;
}

export default function RecipeBook() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Load pantry items on component mount
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
      setLoading(false);
    }
  };

  // Extract unique food item names from pantry
  const getIngredientsFromPantry = (): string[] => {
    const uniqueIngredients = new Set<string>();
    
    pantryItems.forEach(item => {
      item.foodItems.forEach(foodItem => {
        uniqueIngredients.add(foodItem.name);
      });
    });
    
    return Array.from(uniqueIngredients);
  };

  // Generate recipes using Mistral AI
  const generateRecipes = async () => {
    setGenerating(true);
    
    try {
      const ingredients = getIngredientsFromPantry();
      
      if (ingredients.length === 0) {
        alert('No ingredients found in your pantry. Add some items first!');
        setGenerating(false);
        return;
      }
      
      const API_KEY = "S2G8k3FjitWDQSC2LBEXZwjNvm6mZcgP"; // Same key as in camera.tsx
      
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "mistral-small",
          messages: [
            {
              role: "system",
              content: "You are a culinary expert specialized in creating recipes from available ingredients. Provide 3 different recipes using the ingredients list provided. Each recipe should include a title, ingredients list with quantities, and step-by-step cooking instructions. Focus on practical, easy-to-follow recipes."
            },
            {
              role: "user",
              content: `Here are the ingredients in my pantry: ${ingredients.join(', ')}. 
              Please generate 3 different recipes I can make with some or all of these ingredients. 
              Format each recipe with: 
              1. A descriptive title
              2. Required ingredients with quantities
              3. Step-by-step cooking instructions
              4. Approximate cooking time
              5. Difficulty level (Easy, Medium, Hard)
              
              Format your response in a structured way that can be easily parsed into separate recipes.
              Use "RECIPE_START" before each recipe and "RECIPE_END" after each recipe.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const recipesText = data.choices[0].message.content;
      
      // Parse the recipes from the response
      const parsedRecipes = parseRecipesFromText(recipesText);
      setRecipes(parsedRecipes);
      
      // Save the recipes for later use
      await AsyncStorage.setItem('savedRecipes', JSON.stringify(parsedRecipes));
      
    } catch (error) {
      console.error('Error generating recipes:', error);
      alert('Failed to generate recipes. Please try again later.');
    } finally {
      setGenerating(false);
    }
  };

  // Parse recipes from Mistral AI text response
  const parseRecipesFromText = (text: string): Recipe[] => {
    const recipes: Recipe[] = [];
    
    // Split the text by "RECIPE_START" and "RECIPE_END" markers
    const recipeBlocks = text.split(/RECIPE_START|RECIPE_END/).filter(block => block.trim().length > 0);
    
    // If the AI didn't use the markers, try a different approach
    if (recipeBlocks.length === 0 || recipeBlocks.length === 1) {
      // Try to split by numbered recipes (e.g., "Recipe 1:", "Recipe 2:")
      const altBlocks = text.split(/Recipe \d+:|RECIPE \d+:/).filter(block => block.trim().length > 0);
      
      if (altBlocks.length >= 2) {
        // Process each recipe block
        for (const block of altBlocks) {
          const recipe = parseRecipeBlock(block.trim());
          if (recipe) recipes.push(recipe);
        }
        return recipes;
      }
      
      // If still no clear separation, try to parse the entire text as one recipe
      const singleRecipe = parseRecipeBlock(text);
      if (singleRecipe) recipes.push(singleRecipe);
      
      return recipes;
    }
    
    // Process each recipe block
    for (const block of recipeBlocks) {
      const recipe = parseRecipeBlock(block.trim());
      if (recipe) recipes.push(recipe);
    }
    
    return recipes;
  };

  // Parse a single recipe block
  const parseRecipeBlock = (block: string): Recipe | null => {
    try {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Extract title (usually the first line)
      const title = lines[0].replace(/^#|\*|\d+\.|Title:|TITLE:/i, '').trim();
      
      // Initialize recipe object
      const recipe: Recipe = {
        title,
        ingredients: [],
        instructions: [],
        cookingTime: '',
        difficulty: ''
      };
      
      // Parse the rest of the content
      let currentSection: 'ingredients' | 'instructions' | null = null;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect section headers
        if (line.toLowerCase().includes('ingredient')) {
          currentSection = 'ingredients';
          continue;
        } else if (line.toLowerCase().includes('instruction') || line.toLowerCase().includes('direction') || line.toLowerCase().includes('steps')) {
          currentSection = 'instructions';
          continue;
        } else if (line.toLowerCase().includes('cooking time') || line.toLowerCase().includes('preparation time')) {
          const timePart = line.split(':').pop()?.trim() || '';
          recipe.cookingTime = timePart;
          continue;
        } else if (line.toLowerCase().includes('difficulty')) {
          const difficultyPart = line.split(':').pop()?.trim() || '';
          recipe.difficulty = difficultyPart;
          continue;
        }
        
        // Add content to current section
        if (currentSection === 'ingredients' && (line.includes('-') || /^\d+\./.test(line) || /^•/.test(line))) {
          recipe.ingredients.push(line.replace(/^-|^\d+\.|^•/, '').trim());
        } else if (currentSection === 'instructions' && (line.includes('-') || /^\d+\./.test(line) || /^•/.test(line))) {
          recipe.instructions.push(line.replace(/^-|^\d+\.|^•/, '').trim());
        }
      }
      
      // Only return if we have at least a title and some content
      if (recipe.title && (recipe.ingredients.length > 0 || recipe.instructions.length > 0)) {
        return recipe;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing recipe block:', error);
      return null;
    }
  };

  // Load saved recipes if any
  const loadSavedRecipes = async () => {
    try {
      const savedRecipes = await AsyncStorage.getItem('savedRecipes');
      if (savedRecipes) {
        setRecipes(JSON.parse(savedRecipes));
      }
    } catch (error) {
      console.error('Error loading saved recipes:', error);
    }
  };

  // Load saved recipes on component mount
  useEffect(() => {
    loadSavedRecipes();
  }, []);

  // Render each recipe
  const renderRecipe = ({ item, index }: { item: Recipe, index: number }) => {
    return (
      <View style={styles.recipeCard}>
        <Text style={styles.recipeTitle}>{item.title}</Text>
        
        <View style={styles.recipeMetaContainer}>
          {item.cookingTime && (
            <View style={styles.recipeMeta}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.recipeMetaText}>{item.cookingTime}</Text>
            </View>
          )}
          
          {item.difficulty && (
            <View style={styles.recipeMeta}>
              <Ionicons name="stats-chart-outline" size={16} color="#666" />
              <Text style={styles.recipeMetaText}>{item.difficulty}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.recipeSection}>
          <Text style={styles.recipeSectionTitle}>Ingredients:</Text>
          {item.ingredients.map((ingredient, idx) => (
            <Text key={idx} style={styles.recipeText}>• {ingredient}</Text>
          ))}
        </View>
        
        <View style={styles.recipeSection}>
          <Text style={styles.recipeSectionTitle}>Instructions:</Text>
          {item.instructions.map((step, idx) => (
            <Text key={idx} style={styles.recipeText}>{idx + 1}. {step}</Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recipe Book</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => router.push('/pantry')}
          >
            <Ionicons name="basket" size={24} color="white" />
            <Text style={styles.headerButtonText}>Pantry</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text>Loading pantry items...</Text>
        </View>
      ) : (
        <>
          <View style={styles.generateButtonContainer}>
            <TouchableOpacity 
              style={styles.generateButton} 
              onPress={generateRecipes}
              disabled={generating}
            >
              <Ionicons name="restaurant" size={24} color="white" />
              <Text style={styles.generateButtonText}>
                {generating ? 'Generating Recipes...' : 'Generate Recipes from Pantry'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {generating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF9500" />
              <Text>Creating delicious recipes with your ingredients...</Text>
            </View>
          ) : recipes.length > 0 ? (
            <FlatList
              data={recipes}
              renderItem={renderRecipe}
              keyExtractor={(item, index) => `recipe-${index}`}
              contentContainerStyle={styles.recipeList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No recipes generated yet</Text>
              <Text style={styles.emptySubText}>
                Tap the button above to create recipes from your pantry ingredients
              </Text>
            </View>
          )}
        </>
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
    backgroundColor: '#FF9500', // Orange for recipe theme
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  generateButtonContainer: {
    padding: 16,
  },
  generateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  recipeList: {
    padding: 16,
  },
  recipeCard: {
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
  recipeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  recipeMetaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  recipeMetaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  recipeSection: {
    marginBottom: 16,
  },
  recipeSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  recipeText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 4,
  },
});