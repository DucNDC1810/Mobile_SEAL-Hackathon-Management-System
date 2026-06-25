import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { teamApi, contestApi, chatApi } from '../../api/endpoints';
import { colors, spacing, radius, typography } from '../../theme';
import dayjs from 'dayjs';

function MemberCard({ member, isLeader }) {
  const initial = (member.full_name || member.email || '?').charAt(0).toUpperCase();
  return (
    <View style={styles.memberCard}>
      <LinearGradient
        colors={isLeader ? colors.brand.gradient : ['#1E2D45', '#162035']}
        style={styles.memberAvatar}
      >
        <Text style={styles.memberInitial}>{initial}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.memberName}>{member.full_name || member.email}</Text>
          {isLeader && (
            <View style={styles.leaderBadge}>
              <Ionicons name="star" size={10} color="#F59E0B" />
              <Text style={styles.leaderText}>Trưởng nhóm</Text>
            </View>
          )}
        </View>
        <Text style={styles.memberEmail}>{member.email}</Text>
      </View>
      <View style={[styles.verifiedDot, { backgroundColor: member.email_verified ? colors.status.success : colors.status.error }]} />
    </View>
  );
}

function TopicCard({ topic }) {
  if (!topic) return (
    <View style={styles.noTopicBox}>
      <Ionicons name="document-outline" size={28} color={colors.text.muted} />
      <Text style={styles.noTopicText}>Chưa được giao chủ đề</Text>
    </View>
  );
  return (
    <LinearGradient colors={['#1E2D45', '#162035']} style={styles.topicCard}>
      <Ionicons name="bulb" size={24} color={colors.brand.accent} style={{ marginBottom: 8 }} />
      <Text style={styles.topicTitle}>{topic.title}</Text>
      {topic.description ? (
        <Text style={styles.topicDesc}>{topic.description}</Text>
      ) : null}
      {topic.drive_link ? (
        <View style={styles.driveBadge}>
          <Ionicons name="logo-google" size={14} color={colors.brand.primary} />
          <Text style={styles.driveText}>Google Drive link</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

export default function TeamInfoScreen() {
  const { user } = useAuth();
  const [team,      setTeam]      = useState(null);
  const [topic,     setTopic]     = useState(null);
  const [poolName,  setPoolName]  = useState('');
  const [mentors,   setMentors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const fetchData = useCallback(async () => {
    setNetworkError(false);
    try {
      // Get all my teams, pick the one in an open contest
      const myTeamsRes = await teamApi.getMyTeams();
      const myTeams = myTeamsRes.data ?? [];
      if (myTeams.length > 0) {
        // Prefer team in an open contest, fallback to latest
        const sorted = [...myTeams].sort((a, b) => {
          const aOpen = a.contest_id?.status === 'open' ? 1 : 0;
          const bOpen = b.contest_id?.status === 'open' ? 1 : 0;
          return bOpen - aOpen;
        });
        const picked = sorted[0];
        // Fetch full detail to get populated pool_id
        const detailRes = await teamApi.getTeamById(picked._id);
        const teamData = detailRes.data?.data ?? picked;
        setTeam(teamData);
        setTopic(teamData.topic_id ?? null);
        setPoolName(teamData.pool_id?.name ?? '');

        // Fetch mentors for this team
        try {
          const mRes = await chatApi.getTeamMentors(teamData._id);
          setMentors(mRes.data?.data ?? []);
        } catch (_) {}
      }
    } catch (e) {
      console.warn('[TeamInfo] fetch error', e);
      if (!e?.response) setNetworkError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.center}>
        <Ionicons
          name={networkError ? 'wifi-outline' : 'people-outline'}
          size={56}
          color={colors.text.muted}
        />
        <Text style={[styles.emptyText, { marginTop: 16 }]}>
          {networkError ? 'Không thể kết nối máy chủ' : 'Bạn chưa thuộc đội nào'}
        </Text>
        {networkError && (
          <Text
            onPress={() => { setLoading(true); fetchData(); }}
            style={{ color: colors.brand.primary, marginTop: 12, fontWeight: '600' }}
          >
            Thử lại
          </Text>
        )}
      </View>
    );
  }

  const statusMap = {
    CONFIRMED:       { label: 'Đã xác nhận', color: colors.status.success },
    ACTIVE:          { label: 'Đang thi',    color: colors.status.info },
    WAITING_APPROVAL:{ label: 'Chờ duyệt',   color: colors.status.warning },
    PENDING_MEMBERS: { label: 'Chờ thành viên', color: colors.status.warning },
    REJECTED:        { label: 'Bị từ chối',  color: colors.status.error },
    DISQUALIFIED:    { label: 'Bị loại',     color: colors.status.error },
    ELIMINATED:      { label: 'Đã bị loại',  color: colors.status.error },
  };
  const statusInfo = statusMap[team.status] ?? { label: team.status, color: colors.text.muted };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#111827', colors.bg.primary]} style={styles.header}>
        <Text style={styles.screenTitle}>Đội của tôi</Text>
        <View style={[styles.statusPill, { backgroundColor: statusInfo.color + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusPillText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Team name card */}
        <LinearGradient
          colors={colors.brand.gradient}
          style={styles.teamNameCard}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="people" size={36} color="#fff" style={{ marginBottom: 8 }} />
          <Text style={styles.teamName}>{team.team_name}</Text>
          {poolName ? <Text style={styles.teamPool}>Bảng: {poolName}</Text> : null}
        </LinearGradient>

        {/* Topic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chủ đề được giao</Text>
          <TopicCard topic={topic} />
        </View>

        {/* Mentors */}
        {mentors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mentor phụ trách</Text>
            {mentors.map((m, i) => (
              <View key={m.assignmentId ?? i} style={styles.mentorCard}>
                <LinearGradient
                  colors={['#7C3AED', '#4F46E5']}
                  style={styles.mentorAvatar}
                >
                  <Text style={styles.mentorInitial}>
                    {(m.mentorName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mentorName}>{m.mentorName ?? '—'}</Text>
                  <Text style={styles.mentorEmail}>{m.mentorEmail ?? ''}</Text>
                  <Text style={styles.mentorRound}>{m.roundName ?? ''}</Text>
                </View>
                <View style={[styles.mentorBadge, { backgroundColor: m.chatOpen ? '#10B98120' : '#6B728020' }]}>
                  <Text style={[styles.mentorBadgeText, { color: m.chatOpen ? '#10B981' : colors.text.muted }]}>
                    {m.chatOpen ? 'Chat mở' : 'Chat đóng'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Thành viên ({team.members?.length ?? 0} người)
          </Text>
          {team.members?.map((m, i) => (
            <MemberCard
              key={m._id ?? i}
              member={m}
              isLeader={m.user_id === team.leader_id || m.user_id?._id === team.leader_id}
            />
          ))}
        </View>

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đăng ký</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="calendar-outline" label="Ngày tham gia" value={dayjs(team.created_at).format('DD/MM/YYYY HH:mm')} />
            <InfoRow icon="refresh-outline"  label="Cập nhật"      value={dayjs(team.updated_at).format('DD/MM/YYYY HH:mm')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <Ionicons name={icon} size={16} color={colors.text.muted} style={{ marginRight: 8 }} />
      <Text style={[typography.bodySmall, { flex: 1 }]}>{label}</Text>
      <Text style={[typography.body, { fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  header:  { paddingTop: 56, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { ...typography.h2 },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  scroll:  { padding: spacing.md, paddingBottom: spacing.xxl },
  teamNameCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  teamName:    { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  teamPool:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  section:     { marginBottom: spacing.md },
  sectionTitle:{ ...typography.h3, marginBottom: spacing.sm },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
  memberAvatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  memberInitial: { color: '#fff', fontWeight: '700', fontSize: 17 },
  memberName:    { ...typography.body, fontWeight: '600' },
  memberEmail:   { ...typography.caption, marginTop: 2 },
  leaderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F59E0B20', borderRadius: radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  leaderText:  { fontSize: 9, fontWeight: '700', color: '#F59E0B' },
  verifiedDot: { width: 9, height: 9, borderRadius: 5 },
  topicCard: {
    borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border.default,
  },
  topicTitle: { ...typography.h3, marginBottom: 6 },
  topicDesc:  { ...typography.bodySmall, lineHeight: 20 },
  driveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.sm, backgroundColor: colors.brand.primary + '15',
    borderRadius: radius.sm, padding: 6, alignSelf: 'flex-start',
  },
  driveText: { color: colors.brand.primary, fontSize: 12, fontWeight: '600' },
  noTopicBox: {
    alignItems: 'center', padding: spacing.xl,
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border.default, gap: 8,
  },
  noTopicText: { ...typography.body, color: colors.text.muted },
  infoCard: { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border.default },
  emptyText: { ...typography.body, color: colors.text.muted },
  mentorCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.card, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border.default, gap: spacing.md,
  },
  mentorAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  mentorInitial: { color: '#fff', fontWeight: '700', fontSize: 17 },
  mentorName:  { ...typography.body, fontWeight: '600' },
  mentorEmail: { ...typography.caption, marginTop: 2 },
  mentorRound: { ...typography.caption, color: colors.brand.accent, marginTop: 2 },
  mentorBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  mentorBadgeText: { fontSize: 11, fontWeight: '700' },
});
