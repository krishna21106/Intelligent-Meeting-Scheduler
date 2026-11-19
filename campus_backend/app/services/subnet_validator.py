import ipaddress
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
from ..models import Router, CustomerSystem

class SubnetValidationError(Exception):
    pass

def validate_and_parse_subnet(ip: str, subnet_mask: str, gateway: str, dhcp_start: str, dhcp_end: str) -> ipaddress.IPv4Network:
    """
    Validates IPv4 subnet parameters:
    - IP, subnet mask, gateway, dhcp_start, dhcp_end must be valid IPv4
    - Gateway and DHCP range must reside within the defined subnet
    - DHCP start must be <= DHCP end
    - Gateway / Router IP should not be within the DHCP range (best-practice warning/block)
    """
    try:
        ip_obj = ipaddress.IPv4Address(ip)
    except Exception as e:
        raise SubnetValidationError(f"Invalid Router IP address '{ip}': {str(e)}")

    try:
        mask_obj = ipaddress.IPv4Address(subnet_mask)
    except Exception as e:
        raise SubnetValidationError(f"Invalid Subnet Mask '{subnet_mask}': {str(e)}")

    try:
        network = ipaddress.IPv4Network(f"{ip}/{subnet_mask}", strict=False)
    except Exception as e:
        raise SubnetValidationError(f"Cannot form valid IPv4 Network with IP {ip} and Mask {subnet_mask}: {str(e)}")

    # Check Gateway
    try:
        gw_obj = ipaddress.IPv4Address(gateway)
    except Exception as e:
        raise SubnetValidationError(f"Invalid Gateway '{gateway}': {str(e)}")

    if gw_obj not in network:
        raise SubnetValidationError(f"Gateway {gateway} does not belong to subnet {network}")

    if gw_obj == network.network_address or gw_obj == network.broadcast_address:
        raise SubnetValidationError(f"Gateway cannot be network address ({network.network_address}) or broadcast address ({network.broadcast_address})")

    # Check DHCP Range
    try:
        start_obj = ipaddress.IPv4Address(dhcp_start)
        end_obj = ipaddress.IPv4Address(dhcp_end)
    except Exception as e:
        raise SubnetValidationError(f"Invalid DHCP range address: {str(e)}")

    if start_obj not in network:
        raise SubnetValidationError(f"DHCP Start {dhcp_start} is outside subnet {network}")

    if end_obj not in network:
        raise SubnetValidationError(f"DHCP End {dhcp_end} is outside subnet {network}")

    if int(start_obj) > int(end_obj):
        raise SubnetValidationError(f"DHCP Start ({dhcp_start}) cannot be greater than DHCP End ({dhcp_end})")

    if start_obj <= gw_obj <= end_obj:
        raise SubnetValidationError(f"Gateway IP {gateway} falls inside the DHCP assignable range ({dhcp_start} - {dhcp_end})")

    if start_obj <= ip_obj <= end_obj and ip_obj != gw_obj:
        raise SubnetValidationError(f"Router IP {ip} falls inside the DHCP assignable range ({dhcp_start} - {dhcp_end})")

    return network


def check_subnet_overlap(db: Session, ip: str, subnet_mask: str, exclude_router_id: Optional[int] = None) -> None:
    """
    Ensures that the new/updated router network does not overlap with any existing router network in the campus.
    """
    new_net = ipaddress.IPv4Network(f"{ip}/{subnet_mask}", strict=False)

    existing_routers = db.query(Router).all()
    for r in existing_routers:
        if exclude_router_id and r.id == exclude_router_id:
            continue
        try:
            curr_net = ipaddress.IPv4Network(f"{r.ip_address}/{r.subnet_mask}", strict=False)
            if new_net.overlaps(curr_net):
                raise SubnetValidationError(
                    f"Subnet conflict detected! New network {new_net} overlaps with existing Router '{r.name}' ({curr_net})"
                )
        except SubnetValidationError:
            raise
        except Exception:
            continue


def allocate_next_dhcp_ip(db: Session, router: Router) -> str:
    """
    Allocates the lowest available IPv4 address within the router's DHCP pool [dhcp_start, dhcp_end].
    """
    start = int(ipaddress.IPv4Address(router.dhcp_start))
    end = int(ipaddress.IPv4Address(router.dhcp_end))

    used_ips = set(c.ip_address for c in db.query(CustomerSystem).filter(CustomerSystem.router_id == router.id).all())
    used_ips.add(router.ip_address)
    used_ips.add(router.gateway)

    for ip_int in range(start, end + 1):
        candidate_ip = str(ipaddress.IPv4Address(ip_int))
        if candidate_ip not in used_ips:
            return candidate_ip

    raise SubnetValidationError(f"DHCP Pool exhausted on router '{router.name}' ({router.dhcp_start} to {router.dhcp_end})")
