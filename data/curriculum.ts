/**
 * NISER Integrated MSc Biology Curriculum
 * Contains course information organized by semester
 */

export interface Course {
  code: string;
  name: string;
  image: string;
  description: string;
  professors: string[];
}

/**
 * Curriculum data organized by semester
 * NISER Integrated MSc Biology program (5-year program, 10 semesters)
 */
export const CURRICULUM: Record<string, Course[]> = {
  '1': [
    {
      code: 'B101',
      name: 'Biology I',
      image: 'courseicons/b101.png',
      description: 'Science of Life',
      professors: ['Dr. R. Srinivasan, Dr. A. Datta Roy', 'Dr. Rittik Deb', 'Dr. Abdur Rehman', 'Other'],
    },
    {
      code: 'B141',
      name: 'Biology Laboratory-I',
      image: 'courseicons/b141.png',
      description: '',
      professors: ['Dr. R. Srinivasan', 'Dr. Md. Saleem','Other'],
    },
  ],
  '2': [
    {
      code: 'B102',
      name: 'Biology II',
      image: 'courseicons/b102.png',
      description: 'Cellular and Genetic Basis of Life',
      professors: ['Dr. Majusha Dixit', 'Dr. R. Srinivasan', 'Dr. Rittik Deb', 'Dr. A. Datta Roy','Other'],
    },
    {
      code: 'B142',
      name: 'Biology Laboratory-2',
      image: 'courseicons/b142.png',
      description: '',
      professors: ['Dr. R. Srinivasan', 'Dr. Majusha Dixit', 'Dr. Hemabindu Vasuki','Other'],
    },
  ],
  '3': [
    {
      code: 'B201',
      name: 'Microbiology',
      image: 'courseicons/b201.png',
      description: '',
      professors: ['Dr. R. Srinivasan', 'Dr. Harapriya Mohapatra','Other'],
    },
    {
      code: 'B202',
      name: 'Biochemistry',
      image: 'courseicons/b202.png',
      description: '',
      professors: ['Dr. Abdur Rehman','Other'],
    },
    
    {
      code: 'B241',
      name: 'Microbiology Laboratory',
      image: 'courseicons/b241.png',
      description: '',
      professors: ['Dr. R. Srinivasan', 'Dr. Harapriya Mohapatra','Other'],
    },
    {
      code: 'B242',
      name: 'Biochemistry Laboratory',
      image: 'courseicons/b242.png',
      description: '',
      professors: ['Dr. Abdur Rehman','Other'],
    },
  ],
  '4': [
    {
      code: 'B204',
      name: 'Cell Biology',
      image: 'courseicons/b204.png',
      description: '',
      professors: ['Dr. Chandan Goswami', 'Dr. K.C.S. Panigrahi','Other'],
    },
    {
      code: 'B206',
      name: 'Molecular Biology',
      image: 'courseicons/b206.png',
      description: '',
      professors: ['Dr. Pankaj Alone', 'Dr. Tridib Mahata','Other'],
    },
    {
      code: 'B243',
      name: 'Cell Biology Laboratory',
      image: 'courseicons/b243.png',
      description: '',
      professors: ['Dr. Chandan Goswami', 'Dr. K.C.S. Panigrahi','Other'],
    },
    {
      code: 'B245',
      name: 'Molecular Biology Laboratory',
      image: 'courseicons/b245.png',
      description: '',
      professors: ['Dr. Pankaj Alone', 'Dr. Tridib Mahata','Other'],
    },
  ],
  '5': [
    {
      code: 'B301',
      name: 'Animal Physiology',
      image: 'courseicons/b301.png',
      description: '',
      professors: ['Dr. Asima Bhattacharyya'],
    },
    {
      code: 'B302',
      name: 'Plant Physiology',
      image: 'courseicons/b302.png',
      description: '',
      professors: ['Dr. K.C.S. Panigrahi', 'Dr. Himabindu Vasuki'],
    },
    {
      code: 'B303',
      name: 'Ecology',
      image: 'courseicons/b303.png',
      description: '',
      professors: ['Dr. A. Datta Roy','Dr. Rittik Deb'],
    },
    {
      code: 'B341',
      name: 'Animal Physiology Laboratory',
      image: 'courseicons/b341.png',
      description: '',
      professors: ['Dr. Asima Bhattacharyya'],
    },
    {
      code: 'B342',
      name: 'Plant Physiology Laboratory',
      image: 'courseicons/b342.png',
      description: '',
      professors: ['Dr. K.C.S. Panigrahi', 'Dr. Himabindu Vasuki'],
    },
  ],
  '6': [
    {
      code: 'B305',
      name: 'Immunology',
      image: 'courseicons/b305.png',
      description: '',
      professors: ['Dr. Subhasis Chattopadhyay'],
    },
    {
      code: 'B307',
      name: 'Genetics',
      image: 'courseicons/b307.png',
      description: '',
      professors: ['Dr. Majusha Dixit', 'Dr. Debasmita P. Alone', 'Other'],
    },
    {
      code: 'B306',
      name: 'Evolutionary Biology',
      image: 'courseicons/b306.png',
      description: '',
      professors: ['Dr. A. Datta Roy','Dr. Rittik Deb'],
    },
    {
      code: 'B344',
      name: 'Immunology Laboratory',
      image: 'courseicons/b344.png',
      description: '',
      professors: ['Dr. Subhasis Chattopadhyay'],
    },
    {
      code: 'B345',
      name: 'Genetics Laboratory',
      image: 'courseicons/b345.png',
      description: '',
      professors: ['Dr. Majusha Dixit', 'Dr. Debasmita P. Alone', 'Other'],
    },
  ],
  '7': [
    {
      code: 'B402',
      name: 'Developmental Biology',
      image: 'courseicons/b402.png',
      description: '',
      professors: ['Dr. Swagata Ghatak', 'Other'],
    },
    {
      code: 'B405',
      name: 'Bio-techniques',
      image: 'courseicons/b405.png',
      description: '',
      professors: ['Dr. Rudresh Acharya', 'Other'],
    },
    {
      code: 'B406',
      name: 'Introductory Biophysics',
      image: 'courseicons/b406.png',
      description: '',
      professors: ['Dr. Mohammed Saleem'],
    },
  ],
  '8': [
    {
      code: 'B403',
      name: 'Bio-informatics and Computational Biology',
      image: 'courseicons/b403.png',
      description: '',
      professors: [''],
    },
    {
      code: 'B407',
      name: 'Quantitative and Systems Biology',
      image: 'courseicons/b407.png',
      description: '',
      professors: ['Dr. Palok Aich', 'Other'],
    },
    
  ],
  'ADVANCE COURSES': [
    {
      code: 'B451',
      name: 'Advanced Cell Biology',
      image: 'courseicons/b451.png',
      description: '',
      professors: ['Dr. R. Srinivasan'],
    },
    {
      code: 'B455',
      name: 'Enzymology',
      image: 'courseicons/b455.png',
      description: '',
      professors: ['Dr. R. Srinivasan'],
    },
    {
      code: 'B453',
      name: 'Advance Biochemistry',
      image: 'courseicons/b453.png',
      description: '',
      professors: ['Dr. R. Srinivasan'],
    },
    {
      code: 'B460',
      name: 'Virology',
      image: 'courseicons/b460.png',
      description: '',
      professors: ['Dr. R. Srinivasan'],
    },
    {
      code: 'B462',
      name: 'Endocrinology',
      image: 'courseicons/b462.png',
      description: '',
      professors: ['Dr. R. Srinivasan'],
    },
    {
      code: 'B463',
      name: 'Plant Developmental Biology',
      image: 'courseicons/b463.png',
      description: '',
      professors: ['Dr. K.C.S. Panigrahi', 'Dr. Himabindu Vasuki', 'Other'],
    },
    {
      code: 'B464',
      name: 'Neurobiology',
      image: 'courseicons/b464.png',
      description: '',
      professors: ['Dr. R. Srinivasan'],
    },
    {
      code: 'B465',
      name: 'Structural Biology',
      image: 'courseicons/b465.png',
      description: '',
      professors: ['Dr. Rudresh Acharya'],
    },
    {
      code: 'B551',
      name: 'Advanced Molecular Biology',
      image: 'courseicons/b551.png',
      description: '',
      professors: ['Dr. Pankaj Alone', 'Dr. Tridib Mahata'],
    },
    {
      code: 'B554',
      name: 'Cancer Biology',
      image: 'courseicons/b554.png',
      description: '',
      professors: ['Dr. Asima Bhattacharyya'],
    },
    {
      code: 'B555/B702',
      name: 'Molecular Genetics',
      image: 'courseicons/b555.png',
      description: '',
      professors: ['Dr. R. Srinivasan'],
    },
    {
      code: 'BIO700',
      name: 'Research Methodology and Research Publication Ethics',
      image: 'courseicons/b700.png',
      description: '',
      professors: ['Dr. R. Srinivasan'],
    },
  ],
};

/**
 * Base URL for LibGen (Library Genesis) ebook search
 * Used to help students find textbooks and reference materials
 */
export const LIBGEN_BASE_URL = 'https://libgen.is/search.php?req=';
