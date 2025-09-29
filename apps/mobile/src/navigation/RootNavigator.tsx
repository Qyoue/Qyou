import React, { useState } from 'react';


import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { Button } from 'react-native-paper';
import { JobsScreen } from '../screens/JobsScreen';


const Stack = createNativeStackNavigator();
const Tab = createMaterialBottomTabNavigator();


function MainAppTabs() {
    return (
        <Tab.Navigator initialRouteName="Home">
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons name="map-marker" color={color} size={26} />
                    ),
                }}
            />
            <Tab.Screen
                name="Jobs"
                component={JobsScreen}
                options={{
                    tabBarLabel: 'Jobs',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons name="briefcase" color={color} size={26} />
                    ),
                }}
            />
            <Tab.Screen
                name="Wallet"
                component={WalletScreen}
                options={{
                    tabBarLabel: 'Wallet',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons name="wallet" color={color} size={26} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}


function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
        </Stack.Navigator>
    );
}


export function RootNavigator() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    return (
        <>
            <Button onPress={() => setIsLoggedIn(!isLoggedIn)}>
                {isLoggedIn ? 'TEMP: Log Out' : 'TEMP: Log In'}
            </Button>


            {isLoggedIn ? <MainAppTabs /> : <AuthStack />}
        </>
    );
}