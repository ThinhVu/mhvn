import {ObjectId} from 'mongodb';

export type ComputedField<T> = T | null;
export type VirtualField<T> = T | null;
export type Indexed<T> = T;
export type Unique<T> = T;
export type HashedIndex<T> = T;
export type SortedIndex<T> = T;
export type TextIndex<T> = T;
export type RefId<T> = ObjectId;
export type Str<T> = string;
export type I18nString = string;