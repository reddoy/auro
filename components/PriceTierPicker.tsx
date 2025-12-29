import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Colors from '@/constants/Colors';
import { PRICE_TIERS, findNearestTier } from '@/lib/iapPriceTiers';

type Props = {
  visible: boolean;
  value: number | null;
  onValueChange: (value: number) => void;
  onClose: () => void;
  title?: string;
};

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

export default function PriceTierPicker({
  visible,
  value,
  onValueChange,
  onClose,
  title = 'Select Price',
}: Props) {
  const [selectedTier, setSelectedTier] = useState<number>(
    value ? findNearestTier(value) : PRICE_TIERS[0]
  );
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (value) {
      const nearest = findNearestTier(value);
      setSelectedTier(nearest);
    }
  }, [value]);

  const handleConfirm = () => {
    onValueChange(selectedTier);
    onClose();
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString()}`;
  };

  if (Platform.OS === 'ios') {
    return (
      <Modal
        transparent
        animationType="slide"
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.pickerButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>{title}</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={[styles.pickerButton, styles.pickerButtonActive]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedTier}
                onValueChange={(itemValue) => setSelectedTier(itemValue as number)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {PRICE_TIERS.map((tier) => (
                  <Picker.Item
                    key={tier}
                    label={formatPrice(tier)}
                    value={tier}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Android - use native picker
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={[styles.pickerButton, styles.pickerButtonActive]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedTier}
              onValueChange={(itemValue) => setSelectedTier(itemValue as number)}
              style={styles.picker}
            >
              {PRICE_TIERS.map((tier) => (
                <Picker.Item
                  key={tier}
                  label={formatPrice(tier)}
                  value={tier}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: Colors.brand.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  pickerButton: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    fontWeight: '500',
  },
  pickerButtonActive: {
    color: Colors.brand.accentOrange,
    fontWeight: '600',
  },
  pickerWrapper: {
    height: 200,
    overflow: 'hidden',
  },
  picker: {
    height: 200,
    width: '100%',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    fontSize: 18,
    color: Colors.brand.textPrimary,
  },
});
