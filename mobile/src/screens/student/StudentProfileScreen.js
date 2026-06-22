import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius, typography } from '../../theme';

function ProfileField({ icon, label, value, verified }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={18} color={colors.brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value || '—'}</Text>
      </View>
      {verified !== undefined && (
        <Ionicons
          name={verified ? 'checkmark-circle' : 'time-outline'}
          size={18}
          color={verified ? colors.status.success : colors.status.warning}
        />
      )}
    </View>
  );
}

export default function StudentProfileScreen() {
  const { user, signOut, isStudent, isMentor, isAdmin } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
    ]);
  };

  const verifyMap = {
    unsubmitted: { label: 'Chưa nộp hồ sơ',  color: colors.text.muted,      icon: 'document-outline' },
    pending:     { label: 'Đang chờ duyệt',   color: colors.status.warning,  icon: 'time-outline' },
    approved:    { label: 'Đã xác minh',      color: colors.status.success,  icon: 'checkmark-circle' },
    rejected:    { label: 'Bị từ chối',        color: colors.status.error,    icon: 'close-circle' },
  };
  const verifyInfo = verifyMap[user?.profile_verify_status] ?? verifyMap.unsubmitted;
  const initial = (user?.full_name ?? 'U').charAt(0).toUpperCase();

  const roles = user?.roles?.map(r => r.role_name) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <StatusBar barStyle="light-content" />

      {/* Header gradient */}
      <LinearGradient
        colors={['#111827', colors.bg.primary]}
        style={styles.header}
      >
        <Text style={typography.h2}>Hồ sơ cá nhân</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={colors.brand.gradient}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>
          <Text style={styles.fullName}>{user?.full_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {/* Role badges */}
          <View style={styles.roleBadges}>
            {roles.map((role) => (
              <View key={role} style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{role}</Text>
              </View>
            ))}
          </View>

          {/* Profile verify status */}
          <View style={[styles.verifyRow, { backgroundColor: verifyInfo.color + '20' }]}>
            <Ionicons name={verifyInfo.icon} size={14} color={verifyInfo.color} />
            <Text style={[styles.verifyText, { color: verifyInfo.color }]}>{verifyInfo.label}</Text>
          </View>
        </View>

        {/* Info fields */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
          <ProfileField icon="person-outline"    label="Họ và tên"  value={user?.full_name} />
          <ProfileField icon="mail-outline"      label="Email"      value={user?.email} verified={user?.is_verified} />
          <ProfileField icon="call-outline"      label="Số điện thoại" value={user?.phone || 'Chưa cập nhật'} />
          <ProfileField icon="id-card-outline"   label="Mã sinh viên" value={user?.student_id || 'Chưa cập nhật'} />
          <ProfileField icon="shield-checkmark-outline" label="Nhà cung cấp" value={user?.provider === 'google' ? '🔵 Google' : '📧 Email'} />
        </View>

        {/* Auth provider info */}
        {user?.profile_verify_note ? (
          <View style={[styles.card, { borderColor: colors.status.warning }]}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Ionicons name="warning-outline" size={18} color={colors.status.warning} />
              <Text style={[typography.bodySmall, { flex: 1, lineHeight: 20 }]}>
                {user.profile_verify_note}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Logout button */}
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
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  fullName:   { ...typography.h2, marginBottom: 4 },
  email:      { ...typography.bodySmall, marginBottom: spacing.md },
  roleBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: spacing.sm },
  roleBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary + '20',
  },
  roleBadgeText: { color: colors.brand.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
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
    backgroundColor: colors.brand.primary + '15',
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
