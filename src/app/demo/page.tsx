"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";

export default function Demo() {
  return (
    <div className="min-h-screen bg-white p-8 flex items-center justify-center">
      <Card className="w-full max-w-5xl bg-orange-50/40 border-2 border-orange-400 rounded-2xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-bold text-gray-900">Card Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-5">
            <div className="bg-white border-2 border-orange-300 rounded-xl px-6 py-4">
              <div className="flex items-center gap-2 flex-wrap text-gray-800">
                <span className="font-bold uppercase tracking-wide mr-1">DRAW</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-purple-50 border-2 border-purple-300 text-purple-800 hover:bg-purple-100"
                >
                  1 <ChevronDown className="ml-1 size-3" />
                </Button>
                <span className="text-gray-700 ml-1">cards from</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-emerald-50 border-2 border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  Cache <ChevronDown className="ml-1 size-3" />
                </Button>
                <span className="text-gray-700">to</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-emerald-50 border-2 border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  Own Hand <ChevronDown className="ml-1 size-3" />
                </Button>
              </div>
            </div>

            <div className="bg-white border-2 border-orange-300 rounded-xl px-6 py-4">
              <div className="flex items-center gap-2 flex-wrap text-gray-800">
                <span className="font-bold uppercase tracking-wide mr-1">DESTROY</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-purple-50 border-2 border-purple-300 text-purple-800 hover:bg-purple-100"
                >
                  1 <ChevronDown className="ml-1 size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-rose-50 border-2 border-rose-300 text-rose-800 hover:bg-rose-100"
                >
                  card <ChevronDown className="ml-1 size-3" />
                </Button>
                <span className="text-gray-700">cards</span>
              </div>
            </div>

            <div className="bg-white border-2 border-orange-300 rounded-xl px-6 py-4">
              <div className="flex items-center gap-2 flex-wrap text-gray-800">
                <span className="font-bold uppercase tracking-wide mr-1">DISCARD</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-purple-50 border-2 border-purple-300 text-purple-800 hover:bg-purple-100"
                >
                  1 <ChevronDown className="ml-1 size-3" />
                </Button>
                <span className="text-gray-700 ml-1">cards from</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-emerald-50 border-2 border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  Own Hand <ChevronDown className="ml-1 size-3" />
                </Button>
                <span className="text-gray-700">to</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-emerald-50 border-2 border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  Discard Pile <ChevronDown className="ml-1 size-3" />
                </Button>
              </div>
            </div>

            <div className="bg-white border-2 border-orange-300 rounded-xl px-6 py-4">
              <div className="flex items-center gap-2 flex-wrap text-gray-800">
                <span className="font-bold uppercase tracking-wide mr-1">DRAW</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-purple-50 border-2 border-purple-300 text-purple-800 hover:bg-purple-100"
                >
                  1 <ChevronDown className="ml-1 size-3" />
                </Button>
                <span className="text-gray-700 ml-1">cards from</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-emerald-50 border-2 border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  Cache <ChevronDown className="ml-1 size-3" />
                </Button>
                <span className="text-gray-700">to</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-emerald-50 border-2 border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  Own Hand <ChevronDown className="ml-1 size-3" />
                </Button>
              </div>
            </div>

            <div className="w-full justify-center border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 py-10 h-auto rounded-xl text-orange-600 text-sm flex items-center">
              <Plus className="size-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}