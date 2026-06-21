import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { teamApi } from '../../api/endpoints';
import { colors, spacing, radius, typography } from '../../theme';
import dayjs from 'dayjs';

function MemberRow({ member, isLeader }) {
  const initial = (member.full_name || member.email || '?').charAt(0).toUpperCase();
  return (
    <View style={styles.memberRow}>
      <View style={[styles.memberAvatar, { backgroundColor: isLeader ? colors.brand.primary + '40' : colors.bg.elevated }]}>
        <Text style={styles.memberInitial}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.memberName}>{member.full_name || member.email}</Text>
          {isLeader && (
            <View style={styles.leaderTag}>
              <Ionicons name="star" size={9} color="#F59E0B" />
              <Text style={styles.leaderTagText}>Leader</Text>
            </View>
          )}
        </View>
        <Text style={styles.memberEmail}>{member.email}</Text>
        {member.contribution_percentage > 0 && (
          <Text style={styles.contribText}>
            Đóng góp: {member.contribution_percentage}%
          </Text>
        )}
      </View>
      <Ionicons
        name={member.email_verified ? 'checkmark-circle' : 'time-outline'}
        size={18}
        color={member.email_verified ? colors.status.success : colors.status.warning}
      />
    </View>
  );
}

export default function TeamDetailScreen({ route, navigation }) {
  const { assignment } = route.params;
  const team = assignment.team_id;
  const [fullTeam, setFullTeam] = useState(team);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (team?._id) {
      setLoading(true);
      teamApi.getTeamById(team._id)
        .then(r => setFullTeam(r.data?.data ?? team))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [team?._id]);

  const handleChat = () => {
    navigation.navigate('Chat', {
      contestId: assignment.contest_id?._id,
      roundId:   assignment.round_id?._id ?? assignment.round_id,
      teamId:    team?._id,
      mentorId:  assignment.mentor_id,
      teamName:  team?.team_name,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.secondary} />
      </View>
    );
  }

  const topic = fullTeam?.topic_id;
  const members = fullTeam?.members ?? [];
  const leaderId = fullTeam?.leader_id?._id ?? fullTeam?.leader_id;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#111827', colors.bg.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { flex: 1 }]} numberOfLines={1}>
          {fullTeam?.team_name ?? 'Chi tiết nhóm'}
        </Text>
        <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Team banner */}
        <LinearGradient
          colors={[colors.brand.secondary + '40', colors.brand.primary + '30']}
          style={styles.teamBanner}
        >
          <View style={styles.teamBannerIcon}>
            <Text style={styles.teamBannerInitial}>
              {(fullTeam?.team_name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.teamBannerName}>{fullTeam?.team_name}</Text>
          <Text style={styles.teamBannerContest}>
            {assignment.contest_id?.title ?? '—'} · {assignment.round_id?.name ?? '—'}
          </Text>
        </LinearGradient>

        {/* Topic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chủ đề</Text>
          {topic ? (
            <View style={styles.topicCard}>
              <Ionicons name="bulb-outline" size={20} color={colors.brand.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                {topic.description ? (
                  <Text style={styles.topicDesc}>{topic.description}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={styles.noData}>Chưa được giao chủ đề</Text>
          )}
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thành viên ({members.length})</Text>
          {members.map((m, i) => (
            <MemberRow
              key={m._id ?? i}
              member={m}
              isLeader={m.user_id === leaderId || m.user_id?._id === leaderId}
            />
          ))}
        </View>

        {/* Assignment info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin phân công</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="person-outline"  label="Mentor"      value={assignment.mentor_id?.full_name ?? '—'} />
            <InfoRow icon="calendar-outline" label="Phân công"  value={dayjs(assignment.assigned_at).format('DD/MM/YYYY HH:mm')} />
            <InfoRow icon="shield-outline"  label="Pool/Bảng"   value={assignment.board_id?.name ?? '—'} />
          </View>
        </View>

        {/* Chat CTA */}
        <TouchableOpacity style={styles.chatCTA} onPress={handleChat} activeOpacity={0.85}>
          <LinearGradient colors={colors.brand.gradient} style={styles.chatCTAGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="chatbubbles" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.chatCTAText}>Mở Chat với nhóm</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <Ionicons name={icon} size={15} color={colors.text.muted} style={{ marginRight: 8 }} />
      <Text style={[typography.bodySmall, { flex: 1 }]}>{label}</Text>
      <Text style={[typography.body, { fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  header:  { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: spacing.md, paddingHorizontal: spacing.md, gap: spacing.sm },
  backBtn: { padding: 4, marginRight: 4 },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.brand.primary, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  scroll:      { padding: spacing.md, paddingBottom: spacing.xxl },
  teamBanner: {
    borderRadius: radius.xl, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  teamBannerIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  teamBannerInitial: { fontSize: 28, fontWeight: '800', color: '#fff' },
  teamBannerName:    { ...typography.h2, textAlign: 'center', marginBottom: 4 },
  teamBannerContest: { ...typography.bodySmall, textAlign: 'center' },
  section:     { marginBottom: spacing.md },
  sectionTitle:{ ...typography.h3, marginBottom: spacing.sm },
  topicCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border.default,
  },
  topicTitle: { ...typography.body, fontWeight: '700', marginBottom: 4 },
  topicDesc:  { ...typography.bodySmall, lineHeight: 20 },
  noData:     { ...typography.bodySmall, color: colors.text.muted, fontStyle: 'italic' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.card, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border.default, gap: spacing.md,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  memberInitial: { color: colors.text.primary, fontWeight: '700', fontSize: 16 },
  memberName:    { ...typography.body, fontWeight: '600' },
  memberEmail:   { ...typography.caption, marginTop: 2 },
  contribText:   { ...typography.caption, color: colors.brand.accent, marginTop: 2 },
  leaderTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F59E0B20', borderRadius: radius.full,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  leaderTagText: { fontSize: 9, fontWeight: '700', color: '#F59E0B' },
  infoCard: { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border.default },
  chatCTA:  { borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.md, elevation: 4, shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  chatCTAGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 54 },
  chatCTAText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
