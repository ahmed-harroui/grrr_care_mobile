import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePetSelector } from '../context/PetSelectorContext';
import { useTheme } from '../context/ThemeContext';
import { grrrCareApi } from '../lib/grrrr-care-api';
import { AppHeader } from '../components/AppHeader';

export function HealthScreen() {
  const { selectedPetId } = usePetSelector();
  const { colors } = useTheme();
  const [pet, setPet] = useState<any>(null);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [vetVisits, setVetVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vaccines' | 'meds' | 'visits'>('vaccines');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (selectedPetId) {
      loadHealthData();
    }
  }, [selectedPetId, activeTab]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const [pet, vacs, meds, visits] = await Promise.all([
        grrrCareApi.getPetById(selectedPetId!),
        grrrCareApi.getVaccinations(selectedPetId!),
        grrrCareApi.getMedications(selectedPetId!),
        grrrCareApi.getVetVisits(selectedPetId!),
      ]);
      setPet(pet);
      setVaccinations(vacs);
      setMedications(meds);
      setVetVisits(visits);
      console.log('Health data loaded:', { vacs: vacs?.length, meds: meds?.length, visits: visits?.length });
    } catch (error) {
      console.error('Error loading health data:', error);
      setPet(null);
      setVaccinations([]);
      setMedications([]);
      setVetVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (activeTab === 'vaccines') {
        await grrrCareApi.addVaccination(selectedPetId!, { name: newRecord, date: selectedDate.toISOString() });
      } else if (activeTab === 'meds') {
        await grrrCareApi.addMedication(selectedPetId!, { name: newRecord, dosage: 'As prescribed', startDate: selectedDate.toISOString() });
      } else {
        await grrrCareApi.addVetVisit(selectedPetId!, { reason: newRecord, date: selectedDate.toISOString() });
      }
      setNewRecord('');
      setSelectedDate(new Date());
      setShowAddModal(false);
      loadHealthData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add record');
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    console.log('Delete record:', recordId, 'Tab:', activeTab);
    Alert.alert(
      'Delete Record?',
      'This action cannot be undone',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              console.log('Deleting from tab:', activeTab);
              if (activeTab === 'vaccines') {
                await grrrCareApi.deleteVaccination(recordId);
              } else if (activeTab === 'meds') {
                await grrrCareApi.deleteMedication(recordId);
              } else {
                await grrrCareApi.deleteVetVisit(recordId);
              }
              console.log('Delete successful, reloading data');
              loadHealthData();
            } catch (error: any) {
              console.error('Delete failed:', error?.message || error);
              Alert.alert('Error', 'Failed to delete record: ' + (error?.message || 'Unknown error'));
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (!selectedPetId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader colors={colors} />
        <View style={[styles.centerContainer]}>
          <Text style={[styles.title, { color: colors.text }]}>Select a pet to view health records</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabConfig = {
    vaccines: { emoji: '💉', label: 'Vaccines', color: colors.secondary },
    meds: { emoji: '💊', label: 'Medications', color: colors.primary },
    visits: { emoji: '🏥', label: 'Vet Visits', color: colors.warning },
  };

  const data = activeTab === 'vaccines' ? vaccinations : activeTab === 'meds' ? medications : vetVisits;
  const config = tabConfig[activeTab];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <View style={[styles.innerContainer, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>Medical Records</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{pet?.pet_name}</Text>
          </View>
          <View style={[styles.healthBadge, { backgroundColor: colors.secondary }]}>
            <Text style={styles.healthBadgeEmoji}>●</Text>
            <Text style={styles.healthBadgeLabel}>Healthy</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={styles.statEmoji}>💉</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{vaccinations.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Vaccines</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={styles.statEmoji}>💊</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{medications.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Meds</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={styles.statEmoji}>🏥</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{vetVisits.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Visits</Text>
          </View>
        </View>
      </View>

      {/* Premium Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['vaccines', 'meds', 'visits'] as const).map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              {
                borderBottomWidth: activeTab === tab ? 3 : 0,
                borderBottomColor: activeTab === tab ? tabConfig[tab].color : 'transparent',
              }
            ]}
          >
            <Text style={styles.tabEmoji}>{tabConfig[tab].emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === tab ? colors.text : colors.textSecondary,
                  fontWeight: activeTab === tab ? '700' : '500',
                },
              ]}
            >
              {tabConfig[tab].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding} showsVerticalScrollIndicator={false}>
          {data.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{config.emoji}</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No records yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap the + button to add your first {config.label.toLowerCase()} record
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {data.map((record, idx) => (
                <View key={idx} style={styles.timelineItem}>
                  {/* Timeline dot & connector */}
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: config.color }]} />
                    {idx < data.length - 1 && (
                      <View style={[styles.timelineConnector, { backgroundColor: config.color }]} />
                    )}
                  </View>

                  {/* Record card */}
                  <TouchableOpacity
                    style={[styles.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onLongPress={() => handleDeleteRecord(record.id)}
                    delayLongPress={500}
                  >
                    <View style={styles.recordHeader}>
                      <Text style={[styles.recordTitle, { color: colors.text }]}>
                        {activeTab === 'vaccines' ? record.vaccine : activeTab === 'meds' ? record.name : record.reason}
                      </Text>
                      <View style={styles.recordActions}>
                        <View style={[styles.recordBadge, { backgroundColor: config.color }]}>
                          <Text style={styles.recordBadgeEmoji}>{config.emoji}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteRecord(record.id)}
                        >
                          <Text style={styles.deleteIcon}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                      {activeTab === 'vaccines'
                        ? new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : activeTab === 'meds'
                        ? record.dosage
                        : new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>

                    {activeTab === 'meds' && (
                      <View style={[styles.medicationStatus, { backgroundColor: colors.success + '20' }]}>
                        <Text style={[styles.statusText, { color: colors.success }]}>✓ Active</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Premium FAB */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: config.color, shadowColor: config.color }]}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Premium Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>{config.emoji}</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add {activeTab === 'vaccines' ? 'Vaccination' : activeTab === 'meds' ? 'Medication' : 'Vet Visit'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={[styles.modalCloseButton, { backgroundColor: colors.backgroundElement }]}
              >
                <Text style={[styles.modalCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Details</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
                <Text style={styles.inputIcon}>{config.emoji}</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  placeholder={
                    activeTab === 'vaccines'
                      ? 'e.g., Rabies booster'
                      : activeTab === 'meds'
                      ? 'e.g., Amoxicillin 500mg'
                      : 'e.g., Annual checkup'
                  }
                  placeholderTextColor={colors.textTertiary}
                  value={newRecord}
                  onChangeText={setNewRecord}
                />
              </View>

              {/* Date Picker */}
              <Text style={[styles.formLabel, { color: colors.text }, { marginTop: 12 }]}>Date</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateButtonText, { color: colors.text }]}>
                  📅 {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>

              {/* Info Box */}
              <View style={[styles.infoBox, { backgroundColor: colors.backgroundElement }]}>
                <Text style={styles.infoEmoji}>ℹ️</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Records are saved automatically to {pet?.pet_name}'s profile
                </Text>
              </View>
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.backgroundElement }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: config.color }]}
                onPress={handleAddRecord}
              >
                <Text style={styles.saveButtonText}>Save Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={(event: any, date: any) => {
              if (date) {
                setSelectedDate(date);
              }
              setShowDatePicker(false);
            }}
          />
        )}
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },

  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  healthBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  healthBadgeEmoji: { fontSize: 10, color: 'white', fontWeight: '700' },
  healthBadgeLabel: { fontSize: 11, color: 'white', fontWeight: '600' },

  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center' },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600' },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 0 },
  tab: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', gap: 4, flexDirection: 'row', borderBottomWidth: 3 },
  tabEmoji: { fontSize: 16 },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  content: { flex: 1 },
  contentPadding: { paddingHorizontal: 16, paddingVertical: 16 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 13, textAlign: 'center', maxWidth: 200, lineHeight: 18 },

  timeline: { marginTop: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineLeft: { alignItems: 'center', marginRight: 16, width: 30 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  timelineConnector: { width: 2, flex: 1, marginVertical: 4 },

  recordCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recordTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  recordActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  recordBadgeEmoji: { fontSize: 14 },
  deleteButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  deleteIcon: { fontSize: 16 },

  recordMeta: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  medicationStatus: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },

  floatingButton: { position: 'absolute', bottom: 28, right: 16, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  floatingButtonText: { fontSize: 32, color: 'white', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },

  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  modalEmoji: { fontSize: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  modalCloseButton: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 16, fontWeight: '700' },

  modalForm: { marginBottom: 20 },
  formLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, height: 50, gap: 10, marginBottom: 16 },
  inputIcon: { fontSize: 18 },
  modalInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  dateButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
  dateButtonText: { fontSize: 14, fontWeight: '500' },

  infoBox: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoEmoji: { fontSize: 16 },
  infoText: { fontSize: 12, lineHeight: 16, flex: 1, fontWeight: '500' },

  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontWeight: '700', fontSize: 14 },

  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
