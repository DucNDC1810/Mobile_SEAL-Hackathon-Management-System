import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { mentorApi } from '../../api/endpoints';
import { colors, spacing, radius, typography } from '../../theme';
import dayjs from 'dayjs';

const STATUS_MAP = {
  CONFIRMED:        { label: 'Xác nhận',    color: colors.status.success },
  ACTIVE:           { label: 'Đang thi',    color: colors.status.info },
  WAITING_APPROVAL: { label: 'Chờ duyệt',  color: colors.status.warning },
  PENDING_MEMBERS:  { label: 'Chờ TV',      color: colors.status.warning },
  REJECTED:         { label: 'Từ chối',     color: colors.status.error },
  ELIMINATED:       { label: 'Loại',        color: colors.status.error },
  DISQUALIFIED:     { label: 'Bị loại',     color: colors.status.error },
};

function TeamCard({ assignment, onPress }) {
  const team   = assignment.team_id;
  const status = STATUS_MAP[team?.status] ?? { label: team?.status, color: colors.text.muted };
  const initial = (team?.team_name ?? '?').charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.teamCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={[colors.brand.secondary + '80', colors.brand.primary + '60']} style={styles.teamAvatar}>
        <Text style={styles.teamAvatarText}>{initial}</Text>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <Text style={styles.teamName}>{team?.team_name ?? 'Nhóm không tên'}</Text>
        <Text style={styles.teamMeta}>
          {team?.members?.length ?? 0} thành viên ·{' '}
          {assignment.contest_id?.title ?? '—'}
        </Text>
        <Text style={styles.teamRound}>
          {assignment.round_id?.name ?? '—'}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

export default function AssignedTeamsScreen({ navigation }) {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [filter,      setFilter]      = useState('all'); // 'all' | contestId

  const fetchData = useCallback(async () => {
    try {
      const res  = await mentorApi.getMyAssignments();
      setAssignments(res.data?.data ?? []);
    } catch (e) {
      console.warn('[AssignedTeams] fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const contests = [...new Map(
    assignments.map(a => [a.contest_id?._id, a.contest_id])
  ).values()].filter(Boolean);

  const filtered = filter === 'all'
    ? assignments
    : assignments.filter(a => a.contest_id?._id === filter);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.secondary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#111827', colors.bg.primary]} style={styles.header}>
        <Text style={typography.h2}>Nhóm của tôi</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{filtered.length} nhóm</Text>
        </View>
      </LinearGradient>

      {/* Filter chips */}
      {contests.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          {contests.map((c) => (
            <TouchableOpacity
              key={c._id}
              style={[styles.filterChip, filter === c._id && styles.filterChipActive]}
              onPress={() => setFilter(c._id)}
            >
              <Text
                style={[styles.filterChipText, filter === c._id && styles.filterChipTextActive]}
                numberOfLines={1}
              >
                {c.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={52} color={colors.text.muted} />
            <Text style={styles.emptyText}>Chưa có nhóm nào được phân công</Text>
          </View>
        ) : (
          filtered.map((a) => (
            <TeamCard
              key={a._id}
              assignment={a}
              onPress={() => navigation.navigate('TeamDetail', { assignment: a })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  header:  { paddingTop: 56, paddingBottom: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countPill: { backgroundColor: colors.brand.secondary + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  countText: { color: colors.brand.secondary, fontWeight: '700', fontSize: 13 },
  filterRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.default,
  },
  filterChipActive: { backgroundColor: colors.brand.secondary, borderColor: colors.brand.secondary },
  filterChipText: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  teamCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border.default, gap: spacing.md,
  },
  teamAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  teamAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  teamName:   { ...typography.body, fontWeight: '700', marginBottom: 3 },
  teamMeta:   { ...typography.caption, marginBottom: 2 },
  teamRound:  { ...typography.caption, color: colors.brand.accent },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText:  { fontSize: 10, fontWeight: '700' },
  emptyCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.xl, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.border.default,
  },
  emptyText: { ...typography.body, color: colors.text.muted },
});
