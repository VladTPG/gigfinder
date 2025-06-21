"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { 
  followUser, 
  unfollowUser, 
  isFollowingUser
} from "@/lib/firebase/users";
import {
  followBand, 
  unfollowBand, 
  isFollowingBand 
} from "@/lib/firebase/bands";
import { Button } from "./button";
import { UserPlus, UserMinus, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetId: string;
  targetType: "user" | "band";
  targetName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  targetId,
  targetType,
  targetName,
  variant = "default",
  size = "md",
  showIcon = true,
  showText = true,
  className,
  onFollowChange
}: FollowButtonProps) {
  const { userProfile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check initial follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!userProfile || userProfile.id === targetId) {
        setIsCheckingStatus(false);
        return;
      }

      try {
        let following = false;
        if (targetType === "user") {
          following = await isFollowingUser(userProfile.id, targetId);
        } else {
          following = await isFollowingBand(userProfile.id, targetId);
        }
        setIsFollowing(following);
      } catch (err) {
        console.error("Error checking follow status:", err);
        setError("Failed to check follow status");
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkFollowStatus();
  }, [userProfile, targetId, targetType]);

  const handleFollowToggle = async () => {
    if (!userProfile || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isFollowing) {
        // Unfollow
        if (targetType === "user") {
          await unfollowUser(userProfile.id, targetId);
        } else {
          await unfollowBand(userProfile.id, targetId);
        }
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        // Follow
        if (targetType === "user") {
          await followUser(userProfile.id, targetId);
        } else {
          await followBand(userProfile.id, targetId);
        }
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (err: any) {
      console.error("Error toggling follow:", err);
      setError(err.message || "Failed to update follow status");
      
      // Show error briefly then clear it
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button for own profile/band or if not logged in
  if (!userProfile || userProfile.id === targetId || isCheckingStatus) {
    return null;
  }

  const getButtonSize = () => {
    switch (size) {
      case "sm": return "h-8 px-3 text-xs";
      case "lg": return "h-12 px-6 text-base";
      default: return "h-10 px-4 text-sm";
    }
  };

  const getIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    if (targetType === "band") {
      return <Users className="w-4 h-4" />;
    }
    
    return isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />;
  };

  const getButtonText = () => {
    if (isLoading) {
      return isFollowing ? "Unfollowing..." : "Following...";
    }
    
    if (targetType === "band") {
      return isFollowing ? "Unfollow Band" : "Follow Band";
    }
    
    return isFollowing ? "Unfollow" : "Follow";
  };

  const getButtonVariant = () => {
    if (error) return "destructive";
    if (isFollowing && variant === "default") return "outline";
    return variant;
  };

  return (
    <Button
      onClick={handleFollowToggle}
      disabled={isLoading}
      variant={getButtonVariant() as any}
      className={cn(
        getButtonSize(),
        "transition-all duration-200",
        isFollowing && variant === "default" && "hover:bg-destructive hover:text-destructive-foreground",
        className
      )}
      title={error || `${isFollowing ? "Unfollow" : "Follow"} ${targetName || (targetType === "band" ? "this band" : "this user")}`}
    >
      <div className="flex items-center gap-2">
        {showIcon && getIcon()}
        {showText && (
          <span className={cn(
            "transition-all duration-200",
            size === "sm" && "hidden sm:inline"
          )}>
            {error ? "Error" : getButtonText()}
          </span>
        )}
      </div>
    </Button>
  );
}

// Simplified follow button for compact spaces
export function CompactFollowButton({
  targetId,
  targetType,
  className,
  onFollowChange
}: Pick<FollowButtonProps, "targetId" | "targetType" | "className" | "onFollowChange">) {
  return (
    <FollowButton
      targetId={targetId}
      targetType={targetType}
      variant="outline"
      size="sm"
      showText={false}
      className={cn("w-8 h-8 p-0", className)}
      onFollowChange={onFollowChange}
    />
  );
} 