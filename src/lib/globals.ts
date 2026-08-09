/**
 * The 43 legacy modules were written as classic <script> tags sharing one global
 * scope, so they read React, Supabase and JSZip straight off `window` — and some
 * of them do it at *module-init* time, not at call time (`auth-store.jsx:12`
 * destructures `createClient` from `window.supabase` the moment it evaluates).
 *
 * This module republishes those four names onto `window` from real npm packages,
 * and `main.tsx` imports it FIRST. That keeps every existing call site working
 * untouched while removing the five CDN <script> tags — which also removes the
 * supply-chain surface those tags carried (a bad publish on the Supabase CDN tag
 * would have handed over every user's access AND refresh token).
 *
 * These stay on `window` only until the modules that read them are converted to
 * real imports, one file at a time.
 */
import React from "react";
import JSZip from "jszip";
import * as supabase from "@supabase/supabase-js";

Object.assign(window, { React, JSZip, supabase });

export {};
