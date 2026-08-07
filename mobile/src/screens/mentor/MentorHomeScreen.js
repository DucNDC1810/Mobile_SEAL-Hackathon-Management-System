import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { mentorApi } from '../../api/endpoints';
import { colors, spacing, radius, typography } from '../../theme';
import dayjs from 'dayjs';

function StatCard({ label, value, icon, color }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ContestChip({ assignment }) {
  const contestName = assignment.contest_id?.title ?? 'Cuộc thi';
  const roundName   = assignment.round_id?.name   ?? 'Vòng thi';
  return (
    <LinearGradient
      colors={['#1E2D45', '#1A2235']}
      style={styles.contestChip}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
    >
      <Ionicons name="trophy-outline" size={20} color={colors.brand.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.contestChipTitle} numberOfLines={1}>{contestName}</Text>
        <Text style={styles.contestChipSub}>{roundName}</Text>
      </View>
      <View style={styles.assignedAtBadge}>
        <Text style={styles.assignedAtText}>
          {dayjs(assignment.assigned_at).format('DD/MM')}
        </Text>
      </View>
    </LinearGradient>
  );
}

function getRoundName(assignment) {
  const roundId = (assignment.round_id?._id ?? assignment.round_id)?.toString();
  return assignment.contest_id?.rounds?.find(r => r._id?.toString() === roundId)?.name ?? '—';
}

export default function MentorHomeScreen() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await mentorApi.getMyAssignments();
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setAssignments(data);
    } catch (e) {
      console.warn('[MentorHome] fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Deduplicate contests
  const uniqueContests = [...new Map(
    assignments.map(a => [a.contest_id?._id, a.contest_id])
  ).values()].filter(Boolean);

  const uniqueTeams = [...new Set(assignments.map(a => a.team_id?._id))].filter(Boolean);

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

      {/* Header */}
      <LinearGradient colors={['#111827', colors.bg.primary]} style={styles.header}>
        <View>
          <Text style={[typography.bodySmall, { marginBottom: 2 }]}>Xin chào Mentor 🎓</Text>
          <Text style={typography.h2}>{user?.full_name ?? 'Mentor'}</Text>
        </View>
        <LinearGradient
          colors={[colors.brand.secondary, colors.brand.primary]}
          style={styles.avatarCircle}
        >
          <Text style={styles.avatarText}>
            {(user?.full_name ?? 'M').charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Cuộc thi"   value={uniqueContests.length} icon="trophy-outline"  color={colors.brand.primary} />
          <StatCard label="Nhóm"        value={uniqueTeams.length}    icon="people-outline"  color={colors.brand.secondary} />
          <StatCard label="Phân công"   value={assignments.length}    icon="git-branch-outline" color={colors.brand.accent} />
        </View>

        {/* Assignments grouped by contest */}
        {assignments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="briefcase-outline" size={52} color={colors.text.muted} />
            <Text style={styles.emptyText}>Chưa được phân công cuộc thi nào</Text>
          </View>
        ) : (
          <>
            <Text style={[typography.h3, { marginBottom: spacing.md }]}>
              Cuộc thi được phân công
            </Text>
            {/* Unique contests */}
            {uniqueContests.map((contest) => {
              const contestAssignments = assignments.filter(
                a => a.contest_id?._id === contest._id
              );
              return (
                <View key={contest._id} style={styles.contestSection}>
                  <View style={styles.contestHeaderRow}>
                    <Ionicons name="trophy" size={18} color={colors.brand.primary} />
                    <Text style={styles.contestSectionTitle} numberOfLines={1}>
                      {contest.title}
                    </Text>
                    <View style={styles.teamCountBadge}>
                      <Text style={styles.teamCountText}>
                        {contestAssignments.length} nhóm
                      </Text>
                    </View>
                  </View>

                  {contestAssignments.map((a) => (
                    <View key={a._id} style={styles.assignmentRow}>
                      <View style={styles.assignmentDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignmentTeam}>
                          {a.team_id?.team_name ?? 'Nhóm không tên'}
                        </Text>
                        <Text style={styles.assignmentRound}>
                          {getRoundName(a)} · Phân công {dayjs(a.assigned_at).format('DD/MM/YYYY')}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>Active</Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  header:  { paddingTop: 56, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  scroll:  { padding: spacing.md, paddingBottom: spacing.xxl },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', gap: 6,
    borderWidth: 1,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { ...typography.caption, textAlign: 'center' },
  emptyCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.xl, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.border.default,
  },
  emptyText: { ...typography.body, color: colors.text.muted },
  contestChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border.default,
  },
  contestChipTitle: { ...typography.body, fontWeight: '700' },
  contestChipSub:   { ...typography.caption, marginTop: 2 },
  assignedAtBadge: { backgroundColor: colors.brand.primary + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  assignedAtText:  { color: colors.brand.primary, fontSize: 11, fontWeight: '700' },
  contestSection: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border.default,
  },
  contestHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  contestSectionTitle: { ...typography.body, fontWeight: '700', flex: 1 },
  teamCountBadge: { backgroundColor: colors.brand.primary + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  teamCountText:  { color: colors.brand.primary, fontSize: 11, fontWeight: '700' },
  assignmentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border.default,
  },
  assignmentDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.secondary },
  assignmentTeam: { ...typography.body, fontWeight: '600' },
  assignmentRound:{ ...typography.caption, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
});
