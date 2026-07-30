import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius, typography } from '../../theme';

export default function LoginScreen() {
  const { signIn, signInWithGoogle, authError, unverifiedEmail, resendVerification } = useAuth();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loadingEmail,  setLoadingEmail]  = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [resendDone,    setResendDone]    = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setResendDone(false);
    setLoadingEmail(true);
    await signIn(email.trim().toLowerCase(), password);
    setLoadingEmail(false);
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setLoadingResend(true);
    const result = await resendVerification(unverifiedEmail);
    setLoadingResend(false);
    if (result.success) {
      setResendDone(true);
    } else {
      Alert.alert('Không thể gửi lại', result.message);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    const result = await signInWithGoogle();
    setLoadingGoogle(false);
    if (!result.success) {
      Alert.alert('Google Login', result.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Background gradient blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Title */}
          <View style={styles.header}>
            <LinearGradient
              colors={colors.brand.gradient}
              style={styles.logoContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>S</Text>
            </LinearGradient>
            <Text style={styles.appName}>SEAL Hackathon</Text>
            <Text style={styles.tagline}>Quản lý cuộc thi thế hệ mới</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>

            {/* Error message */}
            {authError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}

            {unverifiedEmail && !resendDone ? (
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResendVerification}
                disabled={loadingResend}
                activeOpacity={0.85}
              >
                {loadingResend
                  ? <ActivityIndicator color={colors.brand.primary} size="small" />
                  : <Text style={styles.resendBtnText}>Gửi lại email xác nhận</Text>
                }
              </TouchableOpacity>
            ) : null}

            {resendDone ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color={colors.status.success ?? '#22C55E'} />
                <Text style={styles.successText}>Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư của bạn.</Text>
              </View>
            ) : null}

            {/* Email field */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={colors.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.text.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password field */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.text.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Mật khẩu"
                placeholderTextColor={colors.text.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPass ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={colors.text.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleEmailLogin}
              disabled={loadingEmail}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={colors.brand.gradient}
                style={styles.loginBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loadingEmail
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Đăng nhập</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google button */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleLogin}
              disabled={loadingGoogle}
              activeOpacity={0.85}
            >
              {loadingGoogle
                ? <ActivityIndicator color={colors.text.primary} />
                : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
                    <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            © 2025 SEAL Hackathon · FPT Education
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  blob1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#4F8EF720',
  },
  blob2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#7C5CFC15',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 6,
  },
  card: {
    width: '100%',
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardTitle: {
    ...typography.h2,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 8,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 13,
    flex: 1,
  },
  resendBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    marginTop: -4,
  },
  resendBtnText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E20',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 8,
  },
  successText: {
    color: colors.status.success ?? '#22C55E',
    fontSize: 13,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  loginBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginBtnGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerText: {
    color: colors.text.muted,
    fontSize: 12,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  googleBtnText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.xl,
    color: colors.text.muted,
    fontSize: 12,
  },
});
