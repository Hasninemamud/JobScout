import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { ChevronDownIcon, SearchIcon } from "@/shared/components/Icons";
import { POSTED_OPTIONS, SITE_OPTIONS, TYPE_OPTIONS, type JobType, type PostedWindow, type SearchFilters, type SiteFilter } from "../types";

const SUGGESTED = ["Software Engineer", "Product Manager", "Data Analyst", "UX Designer", "Marketing Manager"];

interface SearchPanelProps {
  draft: SearchFilters;
  isSearching: boolean;
  recent: string[];
  onChange: (patch: Partial<SearchFilters>) => void;
  onFilter: <K extends "posted" | "type" | "remote" | "site">(key: K, value: SearchFilters[K]) => void;
  onSubmit: () => void;
  onPick: (position: string) => void;
}

export function SearchPanel({ draft, isSearching, recent, onChange, onFilter, onSubmit, onPick }: SearchPanelProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  const ideas = recent.length ? recent : SUGGESTED;

  return (
    <div className="panel">
      <form className="panel-form" role="search" onSubmit={handleSubmit}>
        <label className="panel-field">
          <span className="panel-label">Your position</span>
          <span className="panel-control">
            <SearchIcon size={18} />
            <input
              type="search"
              name="position"
              placeholder="e.g. Software Engineer"
              maxLength={100}
              autoComplete="off"
              value={draft.position}
              onChange={(e) => onChange({ position: e.target.value })}
            />
          </span>
        </label>

        <label className="panel-field">
          <span className="panel-label">Company</span>
          <span className="panel-control">
            <input
              type="text"
              name="company"
              placeholder="e.g. Google (optional)"
              maxLength={100}
              autoComplete="off"
              value={draft.company}
              onChange={(e) => onChange({ company: e.target.value })}
            />
          </span>
        </label>

        <label className="panel-field">
          <span className="panel-label">Location</span>
          <span className="panel-control">
            <input
              type="text"
              name="location"
              placeholder="City or country (optional)"
              maxLength={100}
              autoComplete="off"
              value={draft.location}
              onChange={(e) => onChange({ location: e.target.value })}
            />
          </span>
        </label>

        <label className="panel-field">
          <span className="panel-label">Posted</span>
          <span className="panel-control panel-control--select">
            <select value={draft.posted} onChange={(e) => onFilter("posted", e.target.value as PostedWindow)}>
              {POSTED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDownIcon size={18} />
          </span>
        </label>

        <motion.button
          type="submit"
          className="btn btn-orange btn-shine panel-submit"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          {isSearching ? <span className="spinner" aria-hidden="true" /> : null}
          {isSearching ? "Searching" : "Search now"}
        </motion.button>
      </form>

      <div className="panel-extras">
        <label className="mini-select">
          <span className="sr-only">Job site</span>
          <select value={draft.site} onChange={(e) => onFilter("site", e.target.value as SiteFilter)}>
            {SITE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDownIcon size={16} />
        </label>

        <label className="mini-select">
          <span className="sr-only">Job type</span>
          <select value={draft.type} onChange={(e) => onFilter("type", e.target.value as JobType)}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDownIcon size={16} />
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={draft.remote}
          className="switch-chip"
          data-on={draft.remote}
          onClick={() => onFilter("remote", !draft.remote)}
        >
          <span className="switch-track">
            <motion.span
              className="switch-thumb"
              animate={{ x: draft.remote ? 16 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </span>
          Remote only
        </button>

        <span className="panel-divider" aria-hidden="true" />
        <span className="panel-hint">{recent.length ? "Recent" : "Try"}</span>
        {ideas.map((idea) => (
          <motion.button
            key={idea}
            type="button"
            className="pill"
            onClick={() => onPick(idea)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
          >
            {idea}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
