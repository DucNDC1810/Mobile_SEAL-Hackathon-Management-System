import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius, typography } from '../../theme';

function ProfileField({ icon, label, value }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={18} color={colors.brand.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function MentorProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
    ]);
  };

  const initial = (user?.full_name ?? 'M').charAt(0).toUpperCase();
  const roles   = user?.roles?.map(r => r.role_name) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#111827', colors.bg.primary]} style={styles.header}>
        <Text style={typography.h2}>Hồ sơ</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={[colors.brand.secondary, colors.brand.primary]}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>
          <Text style={styles.fullName}>{user?.full_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.roleBadges}>
            {roles.map((role) => (
              <View key={role} style={[styles.roleBadge, { backgroundColor: colors.brand.secondary + '20', borderColor: colors.brand.secondary + '40' }]}>
                <Ionicons name={role === 'mentor' ? 'school' : 'shield'} size={11} color={colors.brand.secondary} />
                <Text style={[styles.roleBadgeText, { color: colors.brand.secondary }]}>
                  {role.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {/* Email verified status */}
          <View style={[
            styles.verifyRow,
            { backgroundColor: user?.is_verified ? colors.status.success + '20' : colors.status.warning + '20' }
          ]}>
            <Ionicons
              name={user?.is_verified ? 'checkmark-circle' : 'time-outline'}
              size={14}
              color={user?.is_verified ? colors.status.success : colors.status.warning}
            />
            <Text style={[
              styles.verifyText,
              { color: user?.is_verified ? colors.status.success : colors.status.warning }
            ]}>
              {user?.is_verified ? 'Email đã xác minh' : 'Email chưa xác minh'}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
          <ProfileField icon="person-outline"    label="Họ và tên"  value={user?.full_name} />
          <ProfileField icon="mail-outline"      label="Email"      value={user?.email} />
          <ProfileField icon="call-outline"      label="Số điện thoại" value={user?.phone} />
          <ProfileField icon="shield-checkmark-outline" label="Đăng nhập qua"
            value={user?.provider === 'google' ? '🔵 Google OAuth' : '📧 Email & Password'}
          />
        </View>

        {/* FPT Email notice */}
        <View style={[styles.card, { borderColor: colors.brand.secondary + '40' }]}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.brand.secondary} />
            <Text style={[typography.bodySmall, { flex: 1, lineHeight: 20, color: colors.text.secondary }]}>
              Tài khoản Mentor được xác thực qua email FPT (@fpt.edu.vn).
              Liên hệ quản trị viên nếu cần hỗ trợ.
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.status.error} />
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>SEAL Hackathon v1.0 · FPT Education</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:  { paddingTop: 56, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  scroll:  { padding: spacing.md, paddingBottom: spacing.xxl },
  avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.brand.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  fullName:   { ...typography.h2, marginBottom: 4 },
  email:      { ...typography.bodySmall, marginBottom: spacing.md },
  roleBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: spacing.sm },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  verifyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full,
  },
  verifyText: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border.default,
  },
  cardTitle: { ...typography.label, marginBottom: spacing.md },
  field: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: colors.border.default, gap: spacing.md,
  },
  fieldIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.brand.secondary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  fieldLabel: { ...typography.caption, marginBottom: 2 },
  fieldValue: { ...typography.body, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.status.error + '15',
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.status.error + '30',
  },
  signOutText: { color: colors.status.error, fontWeight: '700', fontSize: 15 },
  footer: { textAlign: 'center', ...typography.caption, marginTop: spacing.sm },
});
