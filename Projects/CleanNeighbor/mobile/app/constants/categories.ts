export const CATEGORIES = [
  "Wet Waste",
  "Dry Waste",
  "Recyclable Waste",
  "E-Waste",
  "Sanitary Waste",
  "Improperly Dumped Garbage Bag",
  "Overflowing Bin",
  "Missed Collection",
  "Illegal/Open Dumping",
  "Mixed Waste",
  "Waste Burning",
  "Other",
];

export const CATEGORY_DEPARTMENT_MAPPING = {
  "Wet Waste": "Household Collection Team",
  "Dry Waste": "Household Collection Team",
  "Recyclable Waste": "Household Collection Team",
  "E-Waste": "Special Waste Team",
  "Sanitary Waste": "Household Collection Team",
  "Improperly Dumped Garbage Bag": "Street Cleanup Team",
  "Overflowing Bin": "Street Cleanup Team",
  "Missed Collection": "Household Collection Team",
  "Illegal/Open Dumping": "Street Cleanup Team",
  "Mixed Waste": "Household Collection Team",
  "Waste Burning": "Street Cleanup Team",
  "Other": "General Administration"
} as const;

export const CATEGORY_INFO = {
  "Wet Waste": {
    department: "Household Collection Team",
    description: "Biodegradable waste like food scraps",
    icon: "leaf-outline" as const
  },
  "Dry Waste": {
    department: "Household Collection Team", 
    description: "Non-biodegradable waste",
    icon: "trash-outline" as const
  },
  "Recyclable Waste": {
    department: "Household Collection Team",
    description: "Paper, plastic, glass, metal", 
    icon: "sync-outline" as const
  },
  "E-Waste": {
    department: "Special Waste Team",
    description: "Electronic devices and batteries",
    icon: "hardware-chip-outline" as const
  },
  "Sanitary Waste": {
    department: "Household Collection Team", 
    description: "Diapers, sanitary pads, medical waste",
    icon: "medical-outline" as const
  },
  "Improperly Dumped Garbage Bag": {
    department: "Street Cleanup Team",
    description: "Garbage bags left on the street",
    icon: "alert-circle-outline" as const
  },
  "Overflowing Bin": {
    department: "Street Cleanup Team",
    description: "Public bins that need emptying", 
    icon: "trash-bin-outline" as const
  },
  "Missed Collection": {
    department: "Household Collection Team",
    description: "Waste collector did not arrive",
    icon: "calendar-outline" as const
  },
  "Illegal/Open Dumping": {
    department: "Street Cleanup Team",
    description: "Large scale unauthorized dumping",
    icon: "warning-outline" as const
  },
  "Mixed Waste": {
    department: "Household Collection Team", 
    description: "Unsegregated waste at collection",
    icon: "git-merge-outline" as const
  },
  "Waste Burning": {
    department: "Street Cleanup Team", 
    description: "Burning of garbage in public",
    icon: "flame-outline" as const
  },
  "Other": {
    department: "General Administration",
    description: "Issues that don't fit into specific categories",
    icon: "help-circle-outline" as const
  }
};

export function getCategoryDepartment(category: string): string | null {
  return CATEGORY_DEPARTMENT_MAPPING[category as keyof typeof CATEGORY_DEPARTMENT_MAPPING] || null;
}

export function getCategoryInfo(category: string) {
  return CATEGORY_INFO[category as keyof typeof CATEGORY_INFO] || null;
}
