const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'sportconnect-domino-main/src/context/TournamentContext.tsx');
const destPath = path.join(__dirname, 'src/contexts/TournamentContext.tsx');

let content = fs.readFileSync(sourcePath, 'utf8');

// Replace imports
content = content.replace(/import \{ Team, Match, Round, TournamentEvent \} from "@\/types";/g, 'import { Team, Match, Round, TournamentEvent } from "../types/domino";');
content = content.replace(/import \{ supabase \} from "@\/lib\/supabase";/g, 'import { supabase } from "../services/supabase";');
content = content.replace(/"use client";\n/g, '');

// Add AsyncStorage import
content = "import AsyncStorage from '@react-native-async-storage/async-storage';\n" + content;

// Replace window.crypto.randomUUID fallback to not use window
content = content.replace(/if \(typeof window !== "undefined" && window.crypto && window.crypto.randomUUID\) \{[\s\S]*?\}/, '');

// Replace localStorage.getItem
content = content.replace(/const savedEvents = localStorage.getItem\("sc_events"\);/g, 'const savedEvents = await AsyncStorage.getItem("sc_events");');
content = content.replace(/const savedAuth = localStorage.getItem\("sc_admin_auth"\);/g, 'const savedAuth = await AsyncStorage.getItem("sc_admin_auth");');

// Replace localStorage.setItem
content = content.replace(/localStorage\.setItem\((.*?)\)/g, 'AsyncStorage.setItem($1)');

// Replace localStorage.removeItem
content = content.replace(/localStorage\.removeItem\((.*?)\)/g, 'AsyncStorage.removeItem($1)');

// Replace window.alert with Alert.alert (requires react-native import)
if(content.includes('window.alert')) {
    content = "import { Alert } from 'react-native';\n" + content;
    content = content.replace(/if \(typeof window !== "undefined"\) \{\s*window\.alert\((.*?)\);\s*\}/g, 'Alert.alert("Aviso", $1);');
}

fs.writeFileSync(destPath, content);
console.log('Context converted');
