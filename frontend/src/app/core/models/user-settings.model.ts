export interface CompanyInformation {
  name: string;
  address: string;
  businessNumber: string;
  incorporationNumber: string;
}

export interface UserImage {
  data: {
    type: string;
    data: Buffer;
  },
  contentType: string;
}

export interface PersonalInformation {
  address: string;
  image?: UserImage;
}

export interface UserSettings {
  companyInformation: CompanyInformation;
  personalInformation: PersonalInformation;
}