import { formatDistanceToNow } from "date-fns"
import { Tv, Radio, Link2, Plus, Pencil, Trash2 } from "lucide-react"

interface Activity {
  id: number
  action: string
  entity: string
  entityId: number
  entityName: string
  timestamp: string
  user: string
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="space-y-8">
      {activities.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">No recent activity</div>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="flex items-start">
            <div className="mr-4 mt-0.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                {getActivityIcon(activity.entity, activity.action)}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-semibold">{activity.user}</span>{" "}
                <span className="text-muted-foreground">{getActionText(activity.action)}</span>{" "}
                <span className="font-semibold">
                  {activity.entityName} <span className="text-muted-foreground">({activity.entity})</span>
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function getActivityIcon(entity: string, action: string) {
  // Entity icons
  if (entity === "service") {
    return <Tv className="h-4 w-4" />
  } else if (entity === "channel") {
    return <Radio className="h-4 w-4" />
  } else if (entity === "mapping") {
    return <Link2 className="h-4 w-4" />
  }

  // Action icons (fallback)
  if (action === "created") {
    return <Plus className="h-4 w-4" />
  } else if (action === "updated") {
    return <Pencil className="h-4 w-4" />
  } else if (action === "deleted") {
    return <Trash2 className="h-4 w-4" />
  }

  return null
}

function getActionText(action: string) {
  switch (action) {
    case "created":
      return "created"
    case "updated":
      return "updated"
    case "deleted":
      return "deleted"
    default:
      return action
  }
}
