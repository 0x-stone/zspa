import { 
  Brain, 
  Search, 
  MessageSquare, 
  ClipboardList, 
  Target, 
  Shuffle,
  DollarSign, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type AgentStep =
  | 'classify_intent'
  | 'parse_intent'
  | 'answer_question'
  | 'collect_info'
  | 'discover_causes'
  | 'resolve_assets'
  | 'generate_quote'
  | 'final_instructions'
  | 'notify_on_error';

export interface StepDefinition {
  name: AgentStep;
  icon: LucideIcon;
  label: string;
  description: string;
  estimatedDuration: number; // seconds
  color: string; // Tailwind color class
}

export const AGENT_STEPS: Record<AgentStep, StepDefinition> = {
  classify_intent: {
    name: 'classify_intent',
    icon: Brain,
    label: 'Understanding Intent',
    description: 'Analyzing your request to determine the best action',
    estimatedDuration: 2,
    color: 'text-purple-400',
  },
  parse_intent: {
    name: 'parse_intent',
    icon: Search,
    label: 'Extracting Details',
    description: 'Parsing search criteria and donation preferences',
    estimatedDuration: 2,
    color: 'text-blue-400',
  },
  answer_question: {
    name: 'answer_question',
    icon: MessageSquare,
    label: 'Answering Question',
    description: 'Researching and formulating response',
    estimatedDuration: 3,
    color: 'text-cyan-400',
  },
  collect_info: {
    name: 'collect_info',
    icon: ClipboardList,
    label: 'Collecting Information',
    description: 'Requesting missing details for donation',
    estimatedDuration: 1,
    color: 'text-yellow-400',
  },
  discover_causes: {
    name: 'discover_causes',
    icon: Target,
    label: 'Finding Causes',
    description: 'Searching verified fundraisers matching your criteria',
    estimatedDuration: 3,
    color: 'text-green-400',
  },
  resolve_assets: {
    name: 'resolve_assets',
    icon: Shuffle,
    label: 'Resolving Tokens',
    description: 'Matching crypto tokens and chains for swap',
    estimatedDuration: 2,
    color: 'text-orange-400',
  },
  generate_quote: {
    name: 'generate_quote',
    icon: DollarSign,
    label: 'Creating Quote',
    description: 'Generating secure cross-chain payment details',
    estimatedDuration: 3,
    color: 'text-primary',
  },
  final_instructions: {
    name: 'final_instructions',
    icon: CheckCircle,
    label: 'Finalizing',
    description: 'Preparing payment instructions',
    estimatedDuration: 1,
    color: 'text-secondary',
  },
  notify_on_error: {
    name: 'notify_on_error',
    icon: AlertTriangle,
    label: 'Error Occurred',
    description: 'Handling error and preparing recovery options',
    estimatedDuration: 1,
    color: 'text-destructive',
  },
};

