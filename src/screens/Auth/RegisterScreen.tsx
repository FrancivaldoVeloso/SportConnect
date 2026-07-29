import React, { useState, useContext } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';

export function RegisterScreen({ navigation }: any) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useContext(AuthContext);

  async function handleRegister() {
    if (!nome || !email || !password || !confirmPassword || !modalidade) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Senhas incompatíveis', 'A senha e a confirmação de senha não coincidem.');
      return;
    }

    setLoading(true);
    
    // Inserção direta no banco (Substitui Supabase Auth)
    const { data, error } = await supabase.from('usuarios').insert([{
      nome,
      email: email.toLowerCase().trim(),
      senha: password, // NOTA: Num app real, senhas DEVEM ser hasheadas (ex: bcrypt) antes de salvar.
      tipo_perfil: 'atleta',
      modalidade_principal: modalidade
    }]).select().single();

    setLoading(false);

    if (error) {
      let errorMessage = 'Ocorreu um erro ao criar a conta. Tente novamente.';
      if (error.code === '23505') { // Postgres Unique Violation
        errorMessage = 'Este e-mail já está cadastrado em nossa plataforma.';
      } else if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else {
        errorMessage = error.message; 
      }
      
      Alert.alert('Falha no Cadastro', errorMessage);
      return;
    }

    // Sucesso - Login automático através do contexto local
    if (data) {
      await signIn(data);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-bg"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
        
        <View className="items-center mb-8 mt-4">
          <Image 
            source={require('../../../assets/logoSport.png')} 
            style={{ width: 140, height: 140 }} 
            resizeMode="contain" 
          />
        </View>

        <Text className="text-white text-3xl font-bold mb-2">Crie sua conta</Text>
        <Text className="text-gray-400 mb-8">Junte-se à maior comunidade amadora.</Text>

        <Input 
          label="Nome Completo" 
          placeholder="João da Silva" 
          value={nome}
          onChangeText={setNome}
        />

        <Input 
          label="E-mail" 
          placeholder="seu@email.com" 
          keyboardType="email-address" 
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Input 
          label="Esporte Preferido" 
          placeholder="Ex: Futebol, Vôlei, Dominó..." 
          value={modalidade}
          onChangeText={setModalidade}
        />
        
        <Input 
          label="Senha" 
          placeholder="Mínimo 6 caracteres" 
          secureTextEntry 
          value={password}
          onChangeText={setPassword}
        />

        <Input 
          label="Confirmar Senha" 
          placeholder="Repita sua senha" 
          secureTextEntry 
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <View className="mb-4" />

        <Button 
          title="Cadastrar" 
          onPress={handleRegister} 
          isLoading={loading} 
        />

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-400">Já tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-brand-primary font-bold">Faça Login</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
