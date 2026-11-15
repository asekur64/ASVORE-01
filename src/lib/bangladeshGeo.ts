export interface DistrictOption {
  nameEn: string;
  nameBn: string;
  upazilas: string[];
}

export const BANGLADESH_DISTRICTS: DistrictOption[] = [
  {
    nameEn: 'Gaibandha',
    nameBn: 'গাইবান্ধা',
    upazilas: [
      'Gaibandha Sadar',
      'Gobindaganj',
      'Palashbari',
      'Sadullapur',
      'Sundarganj',
      'Fulchhari',
      'Saghata',
    ],
  },
  {
    nameEn: 'Dhaka',
    nameBn: 'ঢাকা',
    upazilas: ['Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Savar', 'Keraniganj'],
  },
  {
    nameEn: 'Chattogram',
    nameBn: 'চট্টগ্রাম',
    upazilas: ['Kotwali', 'Panchlaish', 'Halishahar', 'Agrabad', 'Nasirabad', 'Hathazari', 'Sitakunda'],
  },
  {
    nameEn: 'Rangpur',
    nameBn: 'রংপুর',
    upazilas: ['Rangpur Sadar', 'Mithapukur', 'Pirganj', 'Badarganj', 'Kaunia', 'Gangachara'],
  },
  {
    nameEn: 'Bogura',
    nameBn: 'বগুড়া',
    upazilas: ['Bogura Sadar', 'Sherpur', 'Shibganj', 'Sariakandi', 'Sonatola', 'Adamdighi'],
  },
  {
    nameEn: 'Sylhet',
    nameBn: 'সিলেট',
    upazilas: ['Sylhet Sadar', 'Beanibazar', 'Golapganj', 'Companiganj', 'Fenchuganj'],
  },
  {
    nameEn: 'Rajshahi',
    nameBn: 'রাজশাহী',
    upazilas: ['Boalia', 'Motihar', 'Rajpara', 'Paba', 'Godagari', 'Bagha'],
  },
  {
    nameEn: 'Khulna',
    nameBn: 'খুলনা',
    upazilas: ['Khulna Sadar', 'Sonadanga', 'Khalishpur', 'Daulatpur', 'Dumuria', 'Batiaghata'],
  },
  {
    nameEn: 'Mymensingh',
    nameBn: 'ময়মনসিংহ',
    upazilas: ['Mymensingh Sadar', 'Trishal', 'Bhaluka', 'Muktagachha', 'Gaffargaon'],
  },
  {
    nameEn: 'Barishal',
    nameBn: 'বরিশাল',
    upazilas: ['Barishal Sadar', 'Bakerganj', 'Babuganj', 'Banaripara', 'Gournadi'],
  },
  {
    nameEn: 'Cumilla',
    nameBn: 'কুমিল্লা',
    upazilas: ['Cumilla Adarsha Sadar', 'Daudkandi', 'Laksam', 'Chauddagram', 'Chandina'],
  },
  {
    nameEn: 'Gazipur',
    nameBn: 'গাজীপুর',
    upazilas: ['Gazipur Sadar', 'Tongi', 'Kaliakair', 'Sreepur', 'Kapasia'],
  },
  {
    nameEn: 'Narayanganj',
    nameBn: 'নারায়ণগঞ্জ',
    upazilas: ['Narayanganj Sadar', 'Fatullah', 'Siddhirganj', 'Rupganj', 'Sonargaon'],
  },
  {
    nameEn: 'Dinajpur',
    nameBn: 'দিনাজপুর',
    upazilas: ['Dinajpur Sadar', 'Birganj', 'Parbatipur', 'Phulbari', 'Setabganj'],
  },
  {
    nameEn: 'Kurigram',
    nameBn: 'কুড়িগ্রাম',
    upazilas: ['Kurigram Sadar', 'Ulipur', 'Nageshwari', 'Bhurungamari', 'Chilmari'],
  },
  {
    nameEn: 'Joypurhat',
    nameBn: 'জয়পুরহাট',
    upazilas: ['Joypurhat Sadar', 'Panchbibi', 'Kalai', 'Akkelpur', 'Khetlal'],
  },
  {
    nameEn: 'Jashore',
    nameBn: 'যশোর',
    upazilas: ['Jashore Sadar', 'Benapole', 'Abhaynagar', 'Jhikargachha', 'Keshabpur'],
  },
  {
    nameEn: "Cox's Bazar",
    nameBn: 'কক্সবাজার',
    upazilas: ["Cox's Bazar Sadar", 'Chakaria', 'Teknaf', 'Ukhiya', 'Ramu'],
  },
];

export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('1') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

export function isValidBdPhone(phone: string): boolean {
  const normalized = normalizeBdPhone(phone);
  return /^01[3-9]\d{8}$/.test(normalized);
}
