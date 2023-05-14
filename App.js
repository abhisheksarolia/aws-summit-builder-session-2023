import * as React from 'react';
import { useEffect, useState} from "react";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { Button, View, Text, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ButtonN from './component/ButtonN';


// import { withAuthenticator } from 'aws-amplify-react-native'
import {
  Authenticator,
  useAuthenticator,
  useTheme,
} from '@aws-amplify/ui-react-native';

import { Amplify, Analytics, Storage } from 'aws-amplify';
import awsExports from './src/aws-exports';
Amplify.configure(awsExports);

// to disable Analytics
Analytics.disable();

const MyAppHeader = () => {
  const {
    tokens: { space, fontSizes },
  } = useTheme();
  return (
    <View>
      <Text style={{ fontSize: fontSizes.xxxl, padding: space.xl }}>
        SnapToCode
      </Text>
    </View>
  );
};

function SignOutButton() {
  const { signOut } = useAuthenticator();
  return <Button onPress={signOut} title="Sign Out" />;
}


function SnapToCodeScreen({ navigation }) {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [image, setImage] = useState(null);
  const [percentage, setPercentage] = useState(0);
  
  const MINUTE_MS = 10000;
  
  const customPrefix = {
    "public": 'myPublicPrefix/',
    "protected": 'myProtectedPrefix/',
    "private": 'myPrivatePrefix/'
  };

  
  useEffect(() => {
    (async () => {
      if (Constants.platform.ios) {
        const cameraRollStatus =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (
          cameraRollStatus.status !== "granted" ||
          cameraStatus.status !== "granted"
        ) {
          alert("Sorry, we need these permissions to make this work!");
        }
      }
    })();
  }, []);
  
  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: "Images",
      aspect: [4, 3],
    });
    console.log('Image picker result:')
    console.log(JSON.stringify(result));
    this.handleImagePicked(result);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "Images",
      aspect: [4, 3],
      quality: 1,
    });
    console.log(JSON.stringify(result));
    this.handleImagePicked(result);
  };

  this.handleImagePicked = async (pickerResult) => {
    try {
      if (pickerResult.canceled) {
        alert("Upload canceled");
        return;
      } else {
        setPercentage(0);
        const img = await fetchImageFromUri(pickerResult.assets[0].uri);
        console.log('Fetch image from uri response in blob:')
        console.log(JSON.stringify(img));
        console.log('Now uploading returned blob:')
        const uploadUrl = await uploadImage("demo1.png", img);
        console.log('Uploaded url:')
        console.log(JSON.stringify(uploadUrl));
        //this.downloadImage(uploadUrl);
      }
    } catch (e) {
      console.log(JSON.stringify(e));;
      alert("Upload failed");
    }
  };

  async function uploadImage(filename,img) // = (filename, img) => 
  {
    //Auth.currentCredentials();
    console.log('Authenticated user:');
    //console.log(Auth.currentCredentials())
    console.log(user.attributes.email);
    console.log(user.username);
    alert("Your upload initiated!");
    const result = await Storage.put(filename,img, {
      level: "public",
      contentType: "image/png",
      customPrefix: customPrefix.private,
      resumable: true,
        completeCallback: (event) => {
            console.log(`Successfully uploaded ${event.key}`);
            console.log(JSON.stringify(event));
            //this.updatePercentage(100);
        },
        progressCallback: (progress) => {
            console.log(`Uploaded: ${progress.loaded}/${progress.total}`);
            setLoading(progress);
        },
        errorCallback: (err) => {
            console.error('Unexpected error while uploading', err);
        }
    });
    // return Storage.put(filename, img, {
    //   level: "private",
    //   contentType: "image/jpg",
    //   customPrefix: customPrefix.private,
    //   completeCallback: (event) => {
    //         console.log(`Successfully completed uploaded : ${event}`);
    //     },
    //   progressCallback(progress) {
    //     setLoading(progress);
    //   },
    // })
    //   .then((response) => {
    //     console.log(`Successfully uploaded`);
    //     console.log(JSON.stringify(response));
    //     return response.key;
    //   })
    //   .catch((error) => {
    //     console.log(JSON.stringify(error));
    //     return error.response;
    //   });
    return result;
  };

  const setLoading = (progress) => {
    const calculated = parseInt((progress.loaded / progress.total) * 100);
    updatePercentage(calculated); // due to s3 put function scoped
  };

  const updatePercentage = (number) => {
    setPercentage(number);
  };

  this.downloadImage = (uri) => {
    Storage.get(uri, { level: "private", validateObjectExistence: true})
      .then((result) => setImage(result))
      .catch((err) => console.log(JSON.stringify(err)));
  };

  const fetchImageFromUri = async (uri) => {
    console.log(JSON.stringify(uri));
    const response = await this.fetch(uri);
    console.log(JSON.stringify(response));
    const blob = await response.blob();
    console.log('Blob response:');
    console.log(JSON.stringify(blob));
    return blob;
  };

  const copyToClipboard = () => {
    Clipboard.setString(image);
    alert("Copied image URL to clipboard");
  };

  return (
  <View style={styles.container}>
    {percentage != 0 && <Text style={styles.percentage}>Uploaded {percentage}%</Text>}
    
    {percentage == 100 && <Button variation="primary" title="Validate Code" onPress={() => navigation.navigate('CodeEditor',{
      'mypassedprop': percentage
    })} />}

    <Button onPress={pickImage} title="Pick an image from Gallery" />
    <Button onPress={takePhoto} title="Take a photo" />
    <Button
      title="Check Results"
      onPress={() => navigation.navigate('Results')}
    />
    <Button onPress={signOut} title="Sign Out" />
    
  
  </View>
  );
}

function CodeEditorScreen({ route, navigation }){
  const [text, setText] = useState(undefined);
  const [userData, setUserData] = useState(undefined);
  const [saveFlow, setSaveFlow] = useState(false);
  const [helpText, setHelpText] = useState(undefined);
  // let [onceFlow, setOnceFlow] = useState(true);
  var responseData = {};
  var promptData = {};
  // var temp = text
  const { mypassedprop} = route.params;  
  
  console.log(`My passed prop value - ${mypassedprop}`);
  
  const apiUrl = "https://bu54y2jp65.execute-api.us-east-1.amazonaws.com/dev/api";
  
  console.log(text);
  
 
  // useEffect(() => {
  //   getApiResponseWithFetch();
  //   }, []);

  
  // if(onceFlow){
  //     useEffect(() => {
  //   getApiResponseWithFetch();
  //   }, []);
  //   setOnceFlow(false);
  // }
  
  const getApiResponseWithFetch = async () => {
    const response = await fetch(apiUrl);
    const jsonData = await response.json();
    // console.log(jsonData);
    // //setText(jsonData);
    // console.log(typeof(jsonData));
    // console.log(text);
    responseData = (JSON.parse(jsonData));
    // console.log(typeof(responseData.codeblock));
    // console.log(responseData.codeblock);
    console.log("Current text state:")
    console.log(text)
    setText(responseData.codeblock);
    // console.log("New text state:")
    // console.log(text)
 
  };
  
  this.handleTextChange = (e) => {
    // console.log(e)
    // if(isFocused()){
    //   console.log(true)
    // }else{
    //   console.log(false)
    // }
    setUserData('');
    // console.log("Modified code:")
    // console.log(e)
    setUserData(e)
    setSaveFlow(false)
    // console.log(userData)
    //this.setUserData((recentData) => ({ ...recentData, [e.target.name]: e.target.value }));
    // setUserData(e.target.value);
  }
  
  const postBacktoAPI = async () => {
    console.log("About to post:")
    console.log(userData);
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "codeblock": userData,
        }),
      });
    const jsonData = await response.json();
    console.log(jsonData);
    setSaveFlow(true);
    
  //   fetch(apiUrl, {
  //   method: "POST",
  //   headers: {
  //     Accept: "application/json",
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     "codeblock": userData,
  //   }),
  // })
  //   .then((response) => {
  //     console.log("response:")
  //     console.log(JSON.strinify(response.json()))})
  //   .then((responseData) => {
  //     console.log("response data:")
  //     console.log(JSON.stringify(responseData));
  //   })
  //   .done();
    
  }
  
  // this.handleUserData = (textvalue) => {
  //     this.setText(textvalue)
  //     this.setUserData(textvalue)
  //     //text = userData
  // }<Button title="Submit" onPress={() => Alert.alert('Simple Button pressed')} />
  
  const handleSubmission = () => {
    console.log("Current state before API POST:")
    // console.log(text)
    console.log(userData)
    // post to API new edited data 
    console.log("posting to API:")
    postBacktoAPI()
  }
  
  const postPromptToAPI = async () => {
    // console.log("About to post:")
    // console.log(helpText);
    const response = await fetch(apiUrl+'/codehelp', {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "prompt": helpText,
        }),
      });
    const jsonData = await response.json();
    console.log(jsonData);
    console.log(typeof(jsonData.body));
    //setSaveFlow(true);
    setHelpText(jsonData.body)
  }
  
  const getCodeHelp = () => {
    console.log("Help text before API POST:")
    console.log(helpText)
    // post to API new edited data 
    console.log("posting to API:")
    postPromptToAPI()
  }
  
  this.handleHelpTextChange = (e) => {
    // console.log(e)
    // if(isFocused()){
    //   console.log(true)
    // }else{
    //   console.log(false)
    // }
    // console.log("Modified help text:")
    // console.log(e)
    setHelpText(e)
    // setSaveFlow(false)
    // console.log(userData)
    //this.setUserData((recentData) => ({ ...recentData, [e.target.name]: e.target.value }));
    // setUserData(e.target.value);
  }
  
  
    return(
      
    <ScrollView style={styles.contentContainer}>
            {saveFlow == true && <Text>Modified Code submitted ...</Text>}
            <View style={ styles.footerContainer } >
              <Button title="Fetch" onPress={getApiResponseWithFetch} />
              <Button title="Save" onPress={handleSubmission} />
              <Button title="Help" onPress={getCodeHelp}/>
            </View>
            <TextInput multiline={true} maxLength={100} value = {userData} defaultValue = {text} placeholder={'Code Editor'}
                placeholderTextColor="white"
                underlineColorAndroid="transparent"
                style={styles.textInput}
                // onSubmitEditing = {this.handleUserData}
                onChangeText = {this.handleTextChange}
                />
            
            <TextInput multiline={true} maxLength={100} value = {helpText} defaultValue = {''} placeholder={'Code Help'}
                placeholderTextColor="white"
                underlineColorAndroid="transparent"
                style={styles.textInput}
                onChangeText = {this.handleHelpTextChange}
                
                />
            
      </ScrollView>
   
      );
}

function ResultsScreen({ route, navigation }) {
  const [resultData, setResultData] = useState(null);
  const [awaitFlag, setAwaitFlag] = useState(true)
  // const MINUTE_MS = 10000;
  const apiUrl = "https://bu54y2jp65.execute-api.us-east-1.amazonaws.com/dev/api/result";
  var responseData = {};
  
  // this.fetchExecutionResponse = () => {
  //   // Storage.get(uri, { level: "private", validateObjectExistence: true})
  //   //   .then((result) => setImage(result))
  //   //   .catch((err) => console.log(JSON.stringify(err)));
    
  // };
  
  useEffect(() => {
    getApiResultsWithFetch();
  }, []);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     console.log('Logs every 10 seconds');
  //     if(resultData != null)
  //     {
  //       fetchExecutionResponse();
        
  //     }else{
  //       clearInterval(interval);
  //     }
      
  //   }, MINUTE_MS);
  
  //   return () => clearInterval(interval); // This represents the unmount function, in which you need to clear your interval to prevent memory leaks.
  // }, [])
  const getApiResultsWithFetch = async () => {
    const response = await fetch(apiUrl);
    const jsonData = await response.json();
    console.log(jsonData);
    //setText(jsonData);
    console.log(typeof(jsonData));
    // console.log(text);
    responseData = (JSON.parse(jsonData));
    console.log(typeof(responseData.result));
    setResultData(responseData.result);
    setAwaitFlag(false)
    
    }
 
  ;
  
  
  if(resultData == null)
  {
    return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {awaitFlag && <Text> Awaiting Results ...</Text> }
      
    </View>
    );
    
  }else{
    return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {resultData && <Text> {resultData} </Text>}

    </View>
   );
    
  }
  
}

const Stack = createNativeStackNavigator();



function App() {
  const {
    tokens: { colors },
  } = useTheme();
  
  return (
    <Authenticator.Provider>
      <Authenticator
        // will wrap every subcomponent
        Container={(props) => (
          // reuse default `Container` and apply custom background
          <Authenticator.Container
            {...props}
            style={{ backgroundColor: colors.white[20] }}
          />
        )}
        // will render on every subcomponent
        Header={MyAppHeader}
      >
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="SnapToCode" component={SnapToCodeScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="CodeEditor" component={CodeEditorScreen} />
        </Stack.Navigator>
      </NavigationContainer>
        
      </Authenticator>
    </Authenticator.Provider>
  );


  // return (
    // <NavigationContainer>
    //   <Stack.Navigator>
    //     <Stack.Screen name="Home" component={HomeScreen} />
    //     <Stack.Screen name="Details" component={DetailsScreen} />
    //   </Stack.Navigator>
    // </NavigationContainer>
  //earlier
  // <View style={styles.container}>
        //   <SignOutButton />
        // </View>
        
  // );
}


// export default withAuthenticator(App, { includeGreetings: true });
export default App;

  


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  contentContainer: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    backgroundColor: 'white',
  },
  text: {
    backgroundColor: 'whitesmoke',
    color: '#4A90E2',
    fontSize: 24,
    padding: 10,
  },
  textInput: {
    backgroundColor: 'black',
    color: 'white',
    fontSize: 24,
    padding: 10,
    width: '80%',
    height: '70%',
    margin : '5%'
  },
  // btn:{align: 'top'},
  footerContainer: {
    // flex: 1/3,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scrollView: {
    height: '2%',
    width: '100%',
    // margin: 20,
    alignSelf: 'center',
    padding: 20,
    borderWidth: 5,
    borderRadius: 5,
    borderColor: 'black',
    backgroundColor: 'lightblue'
  }
  
})